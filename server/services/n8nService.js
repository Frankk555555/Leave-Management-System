/**
 * Helper service to trigger N8N Webhooks
 */

const getWebhookUrl = () => {
  return process.env.N8N_WEBHOOK_URL || "https://my-leave-n8n.onrender.com/webhook";
};

const getApiKey = () => {
  return process.env.N8N_API_KEY || "";
};

/**
 * Map status to Thai human-readable label and approval step sequence
 * Step 1: Head of Department / Department Head (รอหัวหน้างานพิจารณา)
 * Step 2: Dean / Director (รอคณบดีพิจารณา)
 * Step 3: Vice President (รอคำสั่งรองอธิการบดี)
 */
const getStatusMetadata = (status) => {
  switch (status) {
    case "pending":
      return {
        statusLabel: "รอหัวหน้างานพิจารณา",
        currentStep: 1,
        totalSteps: 3,
        stepName: "หัวหน้างาน",
      };
    case "pending_dean":
      return {
        statusLabel: "รอคณบดีพิจารณา",
        currentStep: 2,
        totalSteps: 3,
        stepName: "คณบดี/ผอ.สำนัก",
      };
    case "pending_vp":
      return {
        statusLabel: "รอคำสั่งรองอธิการบดี",
        currentStep: 3,
        totalSteps: 3,
        stepName: "รองอธิการบดี",
      };
    case "approved":
      return {
        statusLabel: "อนุมัติแล้ว",
        currentStep: 3,
        totalSteps: 3,
        stepName: "อนุมัติครบถ้วน",
      };
    case "confirmed":
      return {
        statusLabel: "ลงข้อมูลในระบบเรียบร้อยแล้ว",
        currentStep: 4,
        totalSteps: 4,
        stepName: "บันทึกข้อมูลเรียบร้อย",
      };
    case "rejected":
      return {
        statusLabel: "ไม่อนุมัติ",
        currentStep: 0,
        totalSteps: 3,
        stepName: "ไม่อนุมัติ",
      };
    case "cancelled":
      return {
        statusLabel: "ยกเลิกแล้ว",
        currentStep: 0,
        totalSteps: 3,
        stepName: "ยกเลิก",
      };
    default:
      return {
        statusLabel: status || "ไม่ระบุ",
        currentStep: 0,
        totalSteps: 3,
        stepName: "ไม่ระบุ",
      };
  }
};

/**
 * Trigger webhook for new leave request (Admin Notification)
 */
const triggerNewLeaveWebhook = async (leaveRequest, user, leaveType) => {
  try {
    const webhookUrl = `${getWebhookUrl().replace(/\/$/, "")}/leave-created`;
    const status = leaveRequest.status || "pending";
    const { statusLabel, currentStep, totalSteps, stepName } = getStatusMetadata(status);

    const payload = {
      event: "leave_created",
      status: status,
      statusLabel,
      currentStep,
      totalSteps,
      stepName,
      leaveRequest: {
        id: leaveRequest.id,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
        reason: leaveRequest.reason,
        status: status,
        statusLabel,
        currentStep,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department?.name || "ไม่ระบุ",
      },
      leaveType: {
        name: leaveType?.name || "ลา",
        code: leaveType?.code,
      },
      frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
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
 * Trigger webhook for leave status update (Requester & Next Approver Notification)
 */
const triggerLeaveStatusWebhook = async (
  leaveRequest,
  user,
  leaveType,
  status,
  note = "",
  nextApprovers = []
) => {
  const finalStatus = status || leaveRequest?.status || "unknown";
  try {
    const webhookUrl = `${getWebhookUrl().replace(/\/$/, "")}/leave-status`;
    const { statusLabel, currentStep, totalSteps, stepName } = getStatusMetadata(finalStatus);

    const approverList = Array.isArray(nextApprovers)
      ? nextApprovers
      : nextApprovers
      ? [nextApprovers]
      : [];

    const normalizedApprovers = approverList.map((a) => ({
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      role: a.role,
      position: a.position,
    }));

    const primaryApprover = normalizedApprovers[0] || null;

    const payload = {
      event: "leave_status_updated",
      status: finalStatus, // "pending_dean", "pending_vp", "approved", "rejected", "confirmed", "cancelled"
      statusLabel,
      currentStep,
      totalSteps,
      stepName,
      note: note,
      nextApprover: primaryApprover,
      nextApprovers: normalizedApprovers,
      leaveRequest: {
        id: leaveRequest.id,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        totalDays: leaveRequest.totalDays,
        status: finalStatus,
        statusLabel,
        currentStep,
        reason: leaveRequest.reason,
      },
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        department: user.department?.name || user.department || "ไม่ระบุ",
      },
      leaveType: {
        name: leaveType?.name || "ลา",
        code: leaveType?.code,
      },
      frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getApiKey(),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(`N8N Webhook (leave-status: ${finalStatus}) triggered successfully`);
    return true;
  } catch (error) {
    console.error(`Error triggering N8N Webhook (leave-status: ${finalStatus}):`, error.message);
    return false;
  }
};

module.exports = {
  getStatusMetadata,
  triggerNewLeaveWebhook,
  triggerLeaveStatusWebhook,
};
