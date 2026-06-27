/**
 * Helper service to trigger N8N Webhooks
 */

const getWebhookUrl = () => {
  return process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/";
};

const getApiKey = () => {
  return process.env.N8N_API_KEY || "";
};

/**
 * Trigger webhook for new leave request (Admin Notification)
 */
const triggerNewLeaveWebhook = async (leaveRequest, user, leaveType) => {
  try {
    const webhookUrl = `${getWebhookUrl().replace(/\/$/, "")}/leave-created`;
    
    const payload = {
      event: "leave_created",
      leaveRequest: {
        id: leaveRequest.id,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
        reason: leaveRequest.reason,
        status: leaveRequest.status
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department?.name || "ไม่ระบุ"
      },
      leaveType: {
        name: leaveType?.name || "ลา",
        code: leaveType?.code
      },
      frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000"
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey()
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`N8N Webhook (leave-created) triggered successfully`);
    return true;
  } catch (error) {
    console.error("Error triggering N8N Webhook (leave-created):", error.message);
    return false;
  }
};

/**
 * Trigger webhook for leave status update (Requester Notification)
 */
const triggerLeaveStatusWebhook = async (leaveRequest, user, leaveType, status, note = "") => {
  try {
    const webhookUrl = `${getWebhookUrl().replace(/\/$/, "")}/leave-status`;
    
    const payload = {
      event: "leave_status_updated",
      status: status, // "approved", "rejected", "confirmed"
      note: note,
      leaveRequest: {
        id: leaveRequest.id,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      },
      leaveType: {
        name: leaveType?.name || "ลา",
        code: leaveType?.code
      },
      frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000"
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey()
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`N8N Webhook (leave-status: ${status}) triggered successfully`);
    return true;
  } catch (error) {
    console.error(`Error triggering N8N Webhook (leave-status: ${status}):`, error.message);
    return false;
  }
};

module.exports = {
  triggerNewLeaveWebhook,
  triggerLeaveStatusWebhook
};
