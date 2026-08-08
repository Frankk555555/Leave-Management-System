/**
 * Queue Job Type Constants
 * Defined centrally to avoid typos and ensure consistent job processing across workers.
 */

const JOB_TYPES = {
  // Email Jobs
  EMAIL_LEAVE_REQUEST: "EMAIL_LEAVE_REQUEST",
  EMAIL_LEAVE_APPROVAL: "EMAIL_LEAVE_APPROVAL",
  EMAIL_ADMIN_PENDING_CONFIRMATION: "EMAIL_ADMIN_PENDING_CONFIRMATION",
  EMAIL_PASSWORD_RESET: "EMAIL_PASSWORD_RESET",
  EMAIL_GENERIC: "EMAIL_GENERIC",

  // Webhook / Integration Jobs
  N8N_WEBHOOK_NEW_LEAVE: "N8N_WEBHOOK_NEW_LEAVE",
  N8N_WEBHOOK_LEAVE_STATUS: "N8N_WEBHOOK_LEAVE_STATUS",
};

const QUEUE_DRIVERS = {
  MEMORY: "memory",
  BULLMQ: "bullmq",
  SYNC: "sync",
};

module.exports = {
  JOB_TYPES,
  QUEUE_DRIVERS,
};
