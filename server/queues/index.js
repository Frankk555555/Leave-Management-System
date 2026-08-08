const { JOB_TYPES, QUEUE_DRIVERS } = require("./queueTypes");
const {
  initQueues,
  addEmailJob,
  addBulkEmailJobs,
  getQueueStats,
  closeQueues,
  getQueueInstance,
  getActiveDriver,
} = require("./queueManager");

module.exports = {
  JOB_TYPES,
  QUEUE_DRIVERS,
  initQueues,
  addEmailJob,
  addBulkEmailJobs,
  getQueueStats,
  closeQueues,
  getQueueInstance,
  getActiveDriver,
};
