const InMemoryQueue = require("../queues/inMemoryQueue");

describe("InMemoryQueue", () => {
  let queue;

  afterEach(async () => {
    if (queue) {
      await queue.close(500);
    }
  });

  it("should process jobs in FIFO order", async () => {
    queue = new InMemoryQueue("test-fifo", { concurrency: 1 });
    const executed = [];

    queue.process(async (job) => {
      executed.push(job.data.index);
      return job.data.index;
    });

    await queue.add("task", { index: 1 });
    await queue.add("task", { index: 2 });
    await queue.add("task", { index: 3 });

    // Wait for jobs to finish
    await new Promise((resolve) => {
      queue.on("drained", resolve);
    });

    expect(executed).toEqual([1, 2, 3]);
    const stats = await queue.getStats();
    expect(stats.completed).toBe(3);
    expect(stats.failed).toBe(0);
  });

  it("should respect concurrency limit", async () => {
    const concurrencyLimit = 2;
    queue = new InMemoryQueue("test-concurrency", { concurrency: concurrencyLimit });
    let currentConcurrent = 0;
    let maxObservedConcurrent = 0;

    queue.process(async (job) => {
      currentConcurrent += 1;
      maxObservedConcurrent = Math.max(maxObservedConcurrent, currentConcurrent);
      await new Promise((r) => setTimeout(r, 10));
      currentConcurrent -= 1;
      return true;
    });

    const drainedPromise = new Promise((resolve) => queue.once("drained", resolve));

    for (let i = 0; i < 5; i++) {
      await queue.add("task", { id: i });
    }

    await drainedPromise;

    expect(maxObservedConcurrent).toBeLessThanOrEqual(concurrencyLimit);
    const stats = await queue.getStats();
    expect(stats.completed).toBe(5);
  }, 10000);

  it("should retry failed jobs up to maxRetries with backoff", async () => {
    queue = new InMemoryQueue("test-retry", {
      concurrency: 1,
      maxRetries: 3,
      backoffDelay: 10,
      exponentialBackoff: false,
    });

    let attemptCount = 0;
    const retryEvents = [];

    queue.on("job:retrying", (job, err, info) => {
      retryEvents.push(info.attempt);
    });

    queue.process(async (job) => {
      attemptCount += 1;
      if (attemptCount < 3) {
        throw new Error("Temporary network error");
      }
      return "success on attempt 3";
    });

    const job = await queue.add("unreliable-task", {});

    await new Promise((resolve) => {
      queue.on("job:completed", resolve);
    });

    expect(attemptCount).toBe(3);
    expect(retryEvents).toEqual([1, 2]);
    const stats = await queue.getStats();
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(0);
  });

  it("should mark job as permanently failed after exhausting maxRetries", async () => {
    queue = new InMemoryQueue("test-permanent-fail", {
      concurrency: 1,
      maxRetries: 2,
      backoffDelay: 10,
    });

    let attempts = 0;
    queue.process(async () => {
      attempts += 1;
      throw new Error("Permanent fatal error");
    });

    await queue.add("failing-task", {});

    await new Promise((resolve) => {
      queue.on("job:failed", resolve);
    });

    expect(attempts).toBe(2);
    const stats = await queue.getStats();
    expect(stats.failed).toBe(1);
    expect(stats.completed).toBe(0);
  });

  it("should support pause and resume", async () => {
    queue = new InMemoryQueue("test-pause", { concurrency: 1 });
    const executed = [];

    queue.process(async (job) => {
      executed.push(job.data.id);
      return true;
    });

    queue.pause();
    await queue.add("task", { id: "a" });

    // Wait 50ms to verify nothing ran while paused
    await new Promise((r) => setTimeout(r, 50));
    expect(executed).toEqual([]);

    queue.resume();
    await new Promise((resolve) => queue.on("drained", resolve));
    expect(executed).toEqual(["a"]);
  });
});
