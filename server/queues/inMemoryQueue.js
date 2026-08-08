const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");

/**
 * In-Memory Async Job Queue
 * Provides reliable, non-blocking asynchronous job execution with concurrency control,
 * retry mechanisms with exponential backoff, rate throttling, and lifecycle events.
 * 
 * Perfect for zero-dependency environments or development, functioning identically in interface to BullMQ.
 */
class InMemoryQueue extends EventEmitter {
  /**
   * @param {string} name - Queue name
   * @param {Object} options
   * @param {number} [options.concurrency=3] - Maximum concurrent jobs running
   * @param {number} [options.maxRetries=3] - Maximum retry attempts on job failure
   * @param {number} [options.backoffDelay=5000] - Base retry backoff delay in ms
   * @param {boolean} [options.exponentialBackoff=true] - Whether to use exponential backoff
   */
  constructor(name, options = {}) {
    super();
    this.name = name || "default";
    this.concurrency = options.concurrency || 3;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3;
    this.backoffDelay = options.backoffDelay || 5000;
    this.exponentialBackoff = options.exponentialBackoff !== false;

    this.waitingJobs = []; // FIFO queue of jobs waiting to run
    this.activeJobs = new Map(); // id -> job
    this.completedCount = 0;
    this.failedCount = 0;

    this.processor = null;
    this.isPaused = false;
    this.isClosing = false;
    this.retryTimers = new Set();
  }

  /**
   * Register the worker processor function
   * @param {Function} processor - async function(job) => result
   */
  process(processor) {
    if (typeof processor !== "function") {
      throw new Error(`[InMemoryQueue:${this.name}] Processor must be a function`);
    }
    this.processor = processor;
    this._processNext();
    return this;
  }

  /**
   * Add a new job to the queue
   * @param {string} name - Job name / type
   * @param {Object} data - Job payload
   * @param {Object} [opts={}] - Optional job-specific options
   * @returns {Object} Job metadata
   */
  async add(name, data = {}, opts = {}) {
    if (this.isClosing) {
      throw new Error(`[InMemoryQueue:${this.name}] Queue is closing, rejecting new jobs`);
    }

    const job = {
      id: opts.jobId || uuidv4(),
      name,
      data,
      opts: {
        attempts: opts.attempts || this.maxRetries,
        backoffDelay: opts.backoffDelay || this.backoffDelay,
        ...opts,
      },
      attemptsMade: 0,
      timestamp: Date.now(),
      processedOn: null,
      finishedOn: null,
      failedReason: null,
      stacktrace: [],
      returnvalue: null,
    };

    if (opts.delay && opts.delay > 0) {
      const timer = setTimeout(() => {
        this.retryTimers.delete(timer);
        this.waitingJobs.push(job);
        this.emit("job:added", job);
        this._processNext();
      }, opts.delay);
      this.retryTimers.add(timer);
    } else {
      this.waitingJobs.push(job);
      this.emit("job:added", job);
      // Asynchronously trigger processing without blocking current tick
      setImmediate(() => this._processNext());
    }

    return job;
  }

  /**
   * Internal scheduler to process queued jobs up to concurrency limit
   */
  _processNext() {
    if (this.isPaused || !this.processor || this.isClosing) {
      return;
    }

    while (this.activeJobs.size < this.concurrency && this.waitingJobs.length > 0) {
      const job = this.waitingJobs.shift();
      if (!job) break;

      this.activeJobs.set(job.id, job);
      job.processedOn = Date.now();
      job.attemptsMade += 1;

      this.emit("job:active", job);

      // Execute processor in isolated async wrapper
      this._executeJob(job).catch((err) => {
        this.emit("error", err);
      });
    }

    if (this.waitingJobs.length === 0 && this.activeJobs.size === 0) {
      this.emit("drained");
    }
  }

  /**
   * Execute single job with error handling and retry logic
   * @private
   */
  async _executeJob(job) {
    try {
      const result = await this.processor(job);
      job.returnvalue = result;
      job.finishedOn = Date.now();

      this.activeJobs.delete(job.id);
      this.completedCount += 1;

      this.emit("job:completed", job, result);
    } catch (error) {
      job.failedReason = error.message;
      if (error.stack) job.stacktrace.push(error.stack);

      this.activeJobs.delete(job.id);

      const maxAttempts = job.opts.attempts;
      if (job.attemptsMade < maxAttempts) {
        // Calculate backoff
        const baseDelay = job.opts.backoffDelay || this.backoffDelay;
        const delay = this.exponentialBackoff
          ? baseDelay * Math.pow(2, job.attemptsMade - 1)
          : baseDelay;

        this.emit("job:retrying", job, error, {
          attempt: job.attemptsMade,
          maxAttempts,
          nextRetryInMs: delay,
        });

        const timer = setTimeout(() => {
          this.retryTimers.delete(timer);
          if (!this.isClosing) {
            this.waitingJobs.push(job);
            this._processNext();
          }
        }, delay);

        this.retryTimers.add(timer);
      } else {
        job.finishedOn = Date.now();
        this.failedCount += 1;
        this.emit("job:failed", job, error);
      }
    } finally {
      // Continue draining queue
      this._processNext();
    }
  }

  /**
   * Pause job execution
   */
  pause() {
    this.isPaused = true;
    this.emit("paused");
  }

  /**
   * Resume job execution
   */
  resume() {
    this.isPaused = false;
    this.emit("resumed");
    this._processNext();
  }

  /**
   * Get queue statistics and metrics
   */
  async getStats() {
    return {
      driver: "memory",
      name: this.name,
      waiting: this.waitingJobs.length,
      active: this.activeJobs.size,
      completed: this.completedCount,
      failed: this.failedCount,
      concurrency: this.concurrency,
      isPaused: this.isPaused,
    };
  }

  /**
   * Gracefully drain and close the queue
   * @param {number} [timeoutMs=10000]
   */
  async close(timeoutMs = 10000) {
    this.isClosing = true;

    // Clear any pending retry timers
    for (const timer of this.retryTimers) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();

    if (this.activeJobs.size === 0) {
      this.emit("closed");
      return true;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      const checkDrain = () => {
        if (this.activeJobs.size === 0) {
          clearTimeout(timeout);
          this.emit("closed");
          resolve(true);
        }
      };

      this.on("job:completed", checkDrain);
      this.on("job:failed", checkDrain);
    });
  }
}

module.exports = InMemoryQueue;
