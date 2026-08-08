const { JOB_TYPES } = require("./queueTypes");
const emailService = require("../services/emailService");
const n8nService = require("../services/n8nService");

/**
 * Worker Job Processor for Email & Notification Tasks
 * Executes background tasks, handles template rendering and external API calls.
 * 
 * @param {Object} job - Job instance from InMemoryQueue or BullMQ
 * @returns {Promise<any>}
 */
const processEmailJob = async (job) => {
  const { name, data, id } = job;
  const startTime = Date.now();

  console.log(`[QueueWorker] Processing job ${id} (type: ${name})...`);

  try {
    let result = null;

    switch (name) {
      case JOB_TYPES.EMAIL_LEAVE_REQUEST: {
        const { supervisor, employee, leaveRequest } = data;
        result = await emailService.sendLeaveRequestEmail(supervisor, employee, leaveRequest);
        break;
      }

      case JOB_TYPES.EMAIL_LEAVE_APPROVAL: {
        const { employee, leaveRequest, isApproved, note } = data;
        result = await emailService.sendApprovalEmail(employee, leaveRequest, isApproved, note);
        break;
      }

      case JOB_TYPES.EMAIL_ADMIN_PENDING_CONFIRMATION: {
        const { admin, employee, leaveRequest } = data;
        result = await emailService.sendLeaveApprovedAdminNotificationEmail(admin, employee, leaveRequest);
        break;
      }

      case JOB_TYPES.EMAIL_PASSWORD_RESET: {
        const { email, resetUrl } = data;
        result = await emailService.sendPasswordResetEmail(email, resetUrl);
        break;
      }

      case JOB_TYPES.EMAIL_GENERIC: {
        const { to, subject, html } = data;
        result = await emailService.sendNotificationEmail(to, subject, html);
        break;
      }

      case JOB_TYPES.N8N_WEBHOOK_NEW_LEAVE: {
        const { leaveRequest, user, leaveType } = data;
        result = await n8nService.triggerNewLeaveWebhook(leaveRequest, user, leaveType);
        break;
      }

      case JOB_TYPES.N8N_WEBHOOK_LEAVE_STATUS: {
        const { leaveRequest, user, leaveType, status, note } = data;
        result = await n8nService.triggerLeaveStatusWebhook(leaveRequest, user, leaveType, status, note);
        break;
      }

      default:
        console.warn(`[QueueWorker] Unknown job type: ${name}`);
        return { success: false, reason: "unknown_job_type" };
    }

    const duration = Date.now() - startTime;
    console.log(`[QueueWorker] Job ${id} (${name}) completed in ${duration}ms (success: ${result})`);
    return { success: result, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[QueueWorker] Job ${id} (${name}) failed after ${duration}ms:`, error.message);
    throw error; // Re-throw to trigger queue retry mechanism
  }
};

module.exports = {
  processEmailJob,
};
