const { QUEUE_DRIVERS, JOB_TYPES } = require("./queueTypes");
const InMemoryQueue = require("./inMemoryQueue");
const { processEmailJob } = require("./emailWorker");

let activeDriver = QUEUE_DRIVERS.MEMORY;
let emailQueueInstance = null;
let bullWorkerInstance = null;
let redisConnection = null;
let isInitialized = false;

/**
 * Determine the appropriate queue driver based on environment variables
 */
const resolveDriver = () => {
  const driverEnv = (process.env.QUEUE_DRIVER || "").toLowerCase().trim();
  if (driverEnv === QUEUE_DRIVERS.BULLMQ || driverEnv === "redis") {
    return QUEUE_DRIVERS.BULLMQ;
  }
  if (driverEnv === QUEUE_DRIVERS.SYNC) {
    return QUEUE_DRIVERS.SYNC;
  }
  if (driverEnv === QUEUE_DRIVERS.MEMORY) {
    return QUEUE_DRIVERS.MEMORY;
  }

  // Auto-detect: if REDIS_URL or REDIS_HOST is set, try BullMQ, otherwise default to memory
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    return QUEUE_DRIVERS.BULLMQ;
  }

  return QUEUE_DRIVERS.MEMORY;
};

/**
 * Initialize Queue and Worker
 */
const initQueues = async (options = {}) => {
  if (isInitialized && emailQueueInstance) {
    return { driver: activeDriver, queue: emailQueueInstance };
  }

  activeDriver = options.driver || resolveDriver();
  const concurrency = parseInt(process.env.EMAIL_QUEUE_CONCURRENCY, 10) || 3;
  const maxRetries = parseInt(process.env.EMAIL_MAX_RETRIES, 10) || 3;
  const backoffDelay = parseInt(process.env.EMAIL_BACKOFF_DELAY, 10) || 5000;

  console.log(`[QueueManager] Initializing background job system using driver: '${activeDriver}'`);

  if (activeDriver === QUEUE_DRIVERS.BULLMQ) {
    try {
      const { Queue, Worker } = require("bullmq");
      const IORedis = require("ioredis");

      const redisOpts = process.env.REDIS_URL
        ? process.env.REDIS_URL
        : {
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: parseInt(process.env.REDIS_PORT, 10) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: null,
          };

      redisConnection = typeof redisOpts === "string" ? new IORedis(redisOpts, { maxRetriesPerRequest: null }) : new IORedis(redisOpts);

      // Verify connection
      await new Promise((resolve, reject) => {
        redisConnection.once("ready", resolve);
        redisConnection.once("error", reject);
      });

      emailQueueInstance = new Queue("emailQueue", {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: maxRetries,
          backoff: {
            type: "exponential",
            delay: backoffDelay,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });

      bullWorkerInstance = new Worker(
        "emailQueue",
        async (job) => {
          return await processEmailJob(job);
        },
        {
          connection: redisConnection,
          concurrency,
        }
      );

      bullWorkerInstance.on("completed", (job) => {
        console.log(`[BullWorker] Job ${job.id} completed`);
      });

      bullWorkerInstance.on("failed", (job, err) => {
        console.error(`[BullWorker] Job ${job?.id} failed:`, err.message);
      });

      console.log(`[QueueManager] BullMQ connected to Redis successfully (concurrency: ${concurrency})`);
    } catch (redisError) {
      console.warn(
        `[QueueManager] Failed to initialize BullMQ (${redisError.message}). Gracefully falling back to In-Memory Queue.`
      );
      activeDriver = QUEUE_DRIVERS.MEMORY;
    }
  }

  if (activeDriver === QUEUE_DRIVERS.MEMORY) {
    emailQueueInstance = new InMemoryQueue("emailQueue", {
      concurrency,
      maxRetries,
      backoffDelay,
    });

    emailQueueInstance.process(async (job) => {
      return await processEmailJob(job);
    });

    emailQueueInstance.on("job:failed", (job, err) => {
      console.error(`[InMemoryQueue] Job ${job.id} (${job.name}) permanently failed after retries:`, err.message);
    });

    console.log(`[QueueManager] InMemoryQueue initialized (concurrency: ${concurrency}, retries: ${maxRetries})`);
  }

  isInitialized = true;
  return { driver: activeDriver, queue: emailQueueInstance };
};

/**
 * Add an email job to the queue
 * @param {string} jobType - Constant from JOB_TYPES
 * @param {Object} data - Payload for the job
 * @param {Object} [options={}] - Custom options
 */
const addEmailJob = async (jobType, data, options = {}) => {
  if (!isInitialized || !emailQueueInstance) {
    await initQueues();
  }

  if (activeDriver === QUEUE_DRIVERS.SYNC) {
    // Direct synchronous execution
    return await processEmailJob({
      id: "sync-" + Date.now(),
      name: jobType,
      data,
    });
  }

  return await emailQueueInstance.add(jobType, data, options);
};

/**
 * Add multiple email jobs at once (bulk dispatch)
 * @param {Array<{ jobType: string, data: Object, options?: Object }>} jobs
 */
const addBulkEmailJobs = async (jobs) => {
  if (!Array.isArray(jobs) || jobs.length === 0) return [];
  const promises = jobs.map((j) => addEmailJob(j.jobType, j.data, j.options));
  return await Promise.all(promises);
};

/**
 * Get queue metrics and operational status
 */
const getQueueStats = async () => {
  if (!isInitialized || !emailQueueInstance) {
    return {
      status: "uninitialized",
      driver: activeDriver,
    };
  }

  if (activeDriver === QUEUE_DRIVERS.MEMORY) {
    const stats = await emailQueueInstance.getStats();
    return {
      status: "active",
      ...stats,
    };
  }

  if (activeDriver === QUEUE_DRIVERS.BULLMQ) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueueInstance.getWaitingCount(),
      emailQueueInstance.getActiveCount(),
      emailQueueInstance.getCompletedCount(),
      emailQueueInstance.getFailedCount(),
      emailQueueInstance.getDelayedCount(),
    ]);

    return {
      status: "active",
      driver: "bullmq",
      name: emailQueueInstance.name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      redisConnected: redisConnection?.status === "ready",
    };
  }

  return {
    status: "active",
    driver: "sync",
  };
};

/**
 * Gracefully close queues and workers
 */
const closeQueues = async (timeoutMs = 5000) => {
  console.log("[QueueManager] Closing queues and draining workers...");

  try {
    if (activeDriver === QUEUE_DRIVERS.MEMORY && emailQueueInstance) {
      await emailQueueInstance.close(timeoutMs);
    } else if (activeDriver === QUEUE_DRIVERS.BULLMQ) {
      if (bullWorkerInstance) await bullWorkerInstance.close();
      if (emailQueueInstance) await emailQueueInstance.close();
      if (redisConnection) await redisConnection.quit();
    }
  } catch (err) {
    console.error("[QueueManager] Error while closing queues:", err.message);
  } finally {
    isInitialized = false;
    emailQueueInstance = null;
    bullWorkerInstance = null;
    redisConnection = null;
    console.log("[QueueManager] Queues closed gracefully.");
  }
};

module.exports = {
  JOB_TYPES,
  QUEUE_DRIVERS,
  initQueues,
  addEmailJob,
  addBulkEmailJobs,
  getQueueStats,
  closeQueues,
  getQueueInstance: () => emailQueueInstance,
  getActiveDriver: () => activeDriver,
};
