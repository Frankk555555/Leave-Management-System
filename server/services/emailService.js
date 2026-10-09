const https = require("https");

// ===================================================
// Email Service - ใช้ Brevo (Sendinblue) HTTP API
// - ไม่ใช้ SMTP (Render บล็อก ports 25/465/587)
// - ส่งได้ทุกอีเมลโดยไม่ต้องมีโดเมนของตัวเอง
// - ฟรี 300 อีเมล/วัน
// ===================================================

/**
 * ส่งอีเมลผ่าน Brevo HTTP API
 */
const sendNotificationEmail = async (to, subject, html) => {
  try {
    const apiKey = process.env.BREVO_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || "noreply@example.com";
    const fromName = "ระบบบริหารการลา";

    if (!apiKey) {
      console.log("Brevo API key not configured (BREVO_API_KEY), skipping email...");
      return false;
    }

    const payload = JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    });

    await callBrevoAPI(payload, apiKey);
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error.message);
    return false;
  }
};

/**
 * Helper: เรียก Brevo REST API ผ่าน native https module
 */
const callBrevoAPI = (payload, apiKey) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.brevo.com",
      port: 443,
      path: "/v3/smtp/email",
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || "{}"));
        } else {
          reject(new Error(`Brevo API error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
};

// ===================================================
// Email Templates
// ===================================================

const sendLeaveRequestEmail = async (supervisor, employee, leaveRequest) => {
  let salutation = "เรียน หัวหน้างาน/หัวหน้าสาขาวิชา";
  let cardTitle = "📝 คำขอลาใหม่";
  let cardSub = "รอความเห็นชอบจากหัวหน้างาน";
  let statusBadge = "รอความเห็นชอบจากหัวหน้างาน";

  if (supervisor?.role === "dean") {
    salutation = "เรียน ท่านคณบดี/ผู้อำนวยการสำนัก/สถาบัน";
    cardTitle = "📝 คำขอลาใหม่ (ระดับคณะ/สำนัก)";
    cardSub = "รอความเห็นชอบจากคณบดี/ผอ.สำนัก";
    statusBadge = "รอความเห็นชอบจากคณบดีเพื่อส่งต่อรองอธิการบดีฯ";
  } else if (supervisor?.role === "vp") {
    salutation = "เรียน ท่านรองอธิการบดีฝ่ายบริหารงานบุคคลและเทคโนโลยีสารสนเทศ";
    cardTitle = "📝 คำขอลาใหม่ (รอคำสั่งอนุญาต)";
    cardSub = "รอคำสั่งอนุญาตจากรองอธิการบดีฯ";
    statusBadge = "รอคำสั่งอนุญาตการลาจากรองอธิการบดีฯ";
  }

  const subject = `[คำขอลาใหม่] ${employee.firstName} ${employee.lastName} - ${getLeaveTypeName(leaveRequest.leaveType)} (${cardSub})`;
  const html = `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px 10px 0 0;">
        <h2 style="color: white; margin: 0;">${cardTitle}</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
        <p style="font-weight: bold; color: #4a5568;">${salutation},</p>
        <p>มีบุคลากรยื่นคำขอลาใหม่ในระบบ และรอการพิจารณาจากท่าน:</p>
        <p><strong>ผู้ขอลา:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p><strong>ตำแหน่ง/สังกัด:</strong> ${employee.position || "-"} / ${employee.department?.name || employee.department || "-"}</p>
        <p><strong>ประเภทการลา:</strong> ${getLeaveTypeName(leaveRequest.leaveType)}</p>
        <p><strong>วันที่:</strong> ${formatDate(leaveRequest.startDate)} - ${formatDate(leaveRequest.endDate)}</p>
        <p><strong>จำนวนวัน:</strong> ${leaveRequest.totalDays} วัน</p>
        <p><strong>เหตุผล:</strong> ${leaveRequest.reason || "-"}</p>
        <p style="color: #667eea; font-weight: bold; margin-top: 15px;">สถานะ: ${statusBadge}</p>
        <div style="margin-top: 25px;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/approvals"
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            ดูรายละเอียดและพิจารณาคำขอลา
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #a0aec0; font-size: 0.8rem; text-align: center;">© ระบบบริหารการลามหาวิทยาลัย</p>
      </div>
    </div>
  `;
  return sendNotificationEmail(supervisor.email, subject, html);
};

const sendApprovalEmail = async (employee, leaveRequest, isApproved, note, stage = null) => {
  let statusTitle = isApproved ? "อนุมัติแล้ว ✅" : "ไม่อนุมัติ ❌";
  let badgeGradient = isApproved
    ? "linear-gradient(135deg, #11998e, #38ef7d)"
    : "linear-gradient(135deg, #ff6b6b, #ee5a5a)";
  let messageText = `คำขอลาของคุณได้รับการ${isApproved ? "อนุมัติ" : "ปฏิเสธ"}แล้ว`;

  if (isApproved) {
    if (stage === "pending_dean") {
      statusTitle = "หัวหน้างานให้ความเห็นชอบแล้ว 👍";
      badgeGradient = "linear-gradient(135deg, #3b82f6, #60a5fa)";
      messageText = `คำขอลาของคุณได้รับความเห็นชอบจากหัวหน้างานเรียบร้อยแล้ว ขณะนี้กำลังส่งต่อไปยังคณบดี/ผอ.สำนัก เพื่อพิจารณาให้ความเห็นชอบ`;
    } else if (stage === "pending_vp") {
      statusTitle = "คณบดีให้ความเห็นชอบแล้ว 👍";
      badgeGradient = "linear-gradient(135deg, #6366f1, #818cf8)";
      messageText = `คำขอลาของคุณได้รับความเห็นชอบจากคณบดี/ผอ.สำนัก เรียบร้อยแล้ว ขณะนี้กำลังส่งต่อไปยังรองอธิการบดีฝ่ายบริหารงานบุคคลฯ เพื่อออกคำสั่งอนุญาต`;
    } else if (stage === "approved") {
      statusTitle = "รองอธิการบดีฯ มีคำสั่งอนุญาตแล้ว ✅";
      badgeGradient = "linear-gradient(135deg, #10b981, #059669)";
      messageText = `คำขอลาของคุณได้รับคำสั่งอนุญาตจากรองอธิการบดีฯ เรียบร้อยแล้ว ขณะนี้กำลังรอเจ้าหน้าที่ฝ่ายบริหารงานบุคคลลงข้อมูลวันลาเข้าระบบ`;
    } else if (stage === "confirmed") {
      statusTitle = "ลงข้อมูลวันลาในระบบเรียบร้อยแล้ว 📋";
      badgeGradient = "linear-gradient(135deg, #059669, #047857)";
      messageText = `คำขอลาของคุณได้รับการลงข้อมูลและตัดยอดวันลาในระบบมหาวิทยาลัยเรียบร้อยแล้ว`;
    }
  } else {
    statusTitle = "ไม่ได้รับความเห็นชอบ / ไม่อนุญาต ❌";
    badgeGradient = "linear-gradient(135deg, #ef4444, #dc2626)";
    messageText = `คำขอลาของคุณไม่ได้รับความเห็นชอบหรือไม่อนุญาตการลา${note ? ` เนื่องจาก: ${note}` : ""}`;
  }

  const subject = `[${statusTitle}] คำขอลา${getLeaveTypeName(leaveRequest.leaveType)}ของคุณ`;
  const html = `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${badgeGradient}; padding: 20px; border-radius: 10px 10px 0 0;">
        <h2 style="color: white; margin: 0;">${statusTitle}</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 1.05rem; color: #2d3748;">${messageText}</p>
        <hr style="border: 0; border-top: 1px solid #f7fafc; margin: 15px 0;" />
        <p><strong>ประเภทการลา:</strong> ${getLeaveTypeName(leaveRequest.leaveType)}</p>
        <p><strong>วันที่:</strong> ${formatDate(leaveRequest.startDate)} - ${formatDate(leaveRequest.endDate)}</p>
        <p><strong>จำนวนวัน:</strong> ${leaveRequest.totalDays} วัน</p>
        ${note ? `<p><strong>หมายเหตุ/ความเห็น:</strong> ${note}</p>` : ""}
        <div style="margin-top: 25px;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/leave-history"
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            ดูประวัติการลา
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #a0aec0; font-size: 0.8rem; text-align: center;">© ระบบบริหารการลามหาวิทยาลัย</p>
      </div>
    </div>
  `;
  return sendNotificationEmail(employee.email, subject, html);
};

const sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = "[ระบบบริหารการลา] ตั้งรหัสผ่านใหม่";
  const html = `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
        <h2 style="color: white; margin: 0;">🔒 รีเซ็ตรหัสผ่านใหม่</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
        <p>สวัสดีครับ/ค่ะ,</p>
        <p>คุณได้รับอีเมลนี้เนื่องจากคุณ (หรือใครบางคน) ได้ร้องขอการตั้งรหัสผ่านใหม่สำหรับบัญชีผู้ใช้งานของคุณในระบบบริการการลา</p>
        <p>กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ภายใน 15 นาทีหลังจากได้รับอีเมลนี้:</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetUrl}"
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            ตั้งรหัสผ่านใหม่
          </a>
        </div>
        <p style="color: #718096; font-size: 0.9rem;">หากคุณไม่ได้ร้องขอการตั้งรหัสผ่านใหม่ กรุณาเพิกเฉยอีเมลนี้ รหัสผ่านเดิมของคุณจะยังคงปลอดภัย</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #a0aec0; font-size: 0.8rem; text-align: center;">© ระบบบริหารการลามหาวิทยาลัย</p>
      </div>
    </div>
  `;
  return sendNotificationEmail(email, subject, html);
};

const sendLeaveApprovedAdminNotificationEmail = async (admin, employee, leaveRequest) => {
  const subject = `[รอลงข้อมูล] ${employee.firstName} ${employee.lastName} - ${getLeaveTypeName(leaveRequest.leaveType)}`;
  const html = `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px 10px 0 0;">
        <h2 style="color: white; margin: 0;">📋 ใบลาผ่านการอนุมัติ (รอลงข้อมูล)</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
        <p><strong>ผู้ขอลา:</strong> ${employee.firstName} ${employee.lastName}</p>
        <p><strong>แผนก/สาขาวิชา:</strong> ${employee.department?.name || employee.department || "-"}</p>
        <p><strong>ประเภทการลา:</strong> ${getLeaveTypeName(leaveRequest.leaveType)}</p>
        <p><strong>วันที่ลา:</strong> ${formatDate(leaveRequest.startDate)} - ${formatDate(leaveRequest.endDate)}</p>
        <p><strong>จำนวนวัน:</strong> ${leaveRequest.totalDays} วัน</p>
        <p><strong>เหตุผล:</strong> ${leaveRequest.reason || "-"}</p>
        <p style="color: #667eea; font-weight: bold; margin-top: 15px;">สถานะ: ผ่านคำสั่งอนุญาตจากรองอธิการบดีฝ่ายบริหารงานบุคคลฯ เรียบร้อยแล้ว รอเจ้าหน้าที่ลงข้อมูลยืนยันวันลาในระบบมหาวิทยาลัย</p>
        <div style="margin-top: 25px;">
          <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/admin/leaves"
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            ดูรายละเอียดและลงข้อมูล
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #a0aec0; font-size: 0.8rem; text-align: center;">© ระบบบริหารการลามหาวิทยาลัย</p>
      </div>
    </div>
  `;
  return sendNotificationEmail(admin.email, subject, html);
};

const sendLeaveCancellationEmail = async (
  recipient,
  employee,
  leaveRequest,
  reason,
  isEmployeeRecipient = false
) => {
  const leaveTypeName = getLeaveTypeName(leaveRequest.leaveType);
  const totalDays = leaveRequest.totalDays;
  const applicantName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
  const reasonText = reason ? ` เนื่องจาก: ${reason}` : "";

  let title = "🚫 มีการยกเลิกใบลา";
  let bodyMessage = `${applicantName} ได้ยกเลิกใบ${leaveTypeName} (${totalDays} วัน)${reason ? ` เหตุผล: ${reason}` : ""}`;
  let subject = `[ยกเลิกใบลา 🚫] ${applicantName} - ${leaveTypeName}`;
  let buttonLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/approvals`;
  let buttonText = "ดูรายการคำขอลา";

  if (isEmployeeRecipient) {
    title = "🚫 ใบลาของคุณถูกยกเลิกแล้ว";
    bodyMessage = `ใบ${leaveTypeName}ของคุณ (${totalDays} วัน) ถูกยกเลิกโดยผู้ดูแลระบบ${reasonText}`;
    subject = `[ยกเลิกใบลา 🚫] ใบลา${leaveTypeName}ของคุณถูกยกเลิก`;
    buttonLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/leave-history`;
    buttonText = "ดูประวัติการลาของคุณ";
  } else if (recipient?.role === "admin") {
    buttonLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/admin/leaves`;
    buttonText = "ดูรายการใบลาทั้งหมด";
  }

  const html = `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #64748b, #475569); padding: 20px; border-radius: 10px 10px 0 0;">
        <h2 style="color: white; margin: 0;">${title}</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-radius: 0 0 10px 10px;">
        <p style="font-size: 1.05rem; color: #334155;">${bodyMessage}</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 15px 0;" />
        <p><strong>ผู้ยื่นขอลา:</strong> ${applicantName}</p>
        <p><strong>ประเภทการลา:</strong> ${leaveTypeName}</p>
        <p><strong>วันที่ลา:</strong> ${formatDate(leaveRequest.startDate)} - ${formatDate(leaveRequest.endDate)}</p>
        <p><strong>จำนวน:</strong> ${totalDays} วัน</p>
        ${reason ? `<p><strong>เหตุผลการยกเลิก:</strong> ${reason}</p>` : ""}
        <div style="margin-top: 25px;">
          <a href="${buttonLink}"
             style="background: linear-gradient(135deg, #64748b, #475569); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            ${buttonText}
          </a>
        </div>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 0.8rem; text-align: center;">© ระบบบริหารการลามหาวิทยาลัย</p>
      </div>
    </div>
  `;
  return sendNotificationEmail(recipient.email, subject, html);
};

// ===================================================
// Background Queue Dispatch Helpers (Non-blocking)
// ===================================================

const { JOB_TYPES } = require("../queues/queueTypes");

const getQueueManager = () => require("../queues/queueManager");

/**
 * Queue a leave request notification email for a single recipient
 */
const queueLeaveRequestEmail = async (recipient, employee, leaveRequest) => {
  const { addEmailJob } = getQueueManager();
  return await addEmailJob(JOB_TYPES.EMAIL_LEAVE_REQUEST, {
    supervisor: recipient,
    employee,
    leaveRequest,
  });
};

/**
 * Queue leave request notification emails for multiple recipients (admins & heads)
 */
const queueLeaveRequestEmails = async (recipients, employee, leaveRequest) => {
  if (!Array.isArray(recipients) || recipients.length === 0) return [];
  const { addBulkEmailJobs } = getQueueManager();
  const jobs = recipients.map((recipient) => ({
    jobType: JOB_TYPES.EMAIL_LEAVE_REQUEST,
    data: {
      supervisor: recipient,
      employee,
      leaveRequest,
    },
  }));
  return await addBulkEmailJobs(jobs);
};

/**
 * Queue an approval/rejection notification email to the employee
 */
const queueApprovalEmail = async (employee, leaveRequest, isApproved, note, stage = null) => {
  const { addEmailJob } = getQueueManager();
  return await addEmailJob(JOB_TYPES.EMAIL_LEAVE_APPROVAL, {
    employee,
    leaveRequest,
    isApproved,
    note,
    stage,
  });
};

/**
 * Queue a notification email to an admin when leave is approved by supervisor
 */
const queueLeaveApprovedAdminNotificationEmail = async (admin, employee, leaveRequest) => {
  const { addEmailJob } = getQueueManager();
  return await addEmailJob(JOB_TYPES.EMAIL_ADMIN_PENDING_CONFIRMATION, {
    admin,
    employee,
    leaveRequest,
  });
};

/**
 * Queue notification emails to multiple admins when leave is approved by supervisor
 */
const queueLeaveApprovedAdminNotificationEmails = async (admins, employee, leaveRequest) => {
  if (!Array.isArray(admins) || admins.length === 0) return [];
  const { addBulkEmailJobs } = getQueueManager();
  const jobs = admins.map((admin) => ({
    jobType: JOB_TYPES.EMAIL_ADMIN_PENDING_CONFIRMATION,
    data: {
      admin,
      employee,
      leaveRequest,
    },
  }));
  return await addBulkEmailJobs(jobs);
};

/**
 * Queue a cancellation notification email for a single recipient (e.g. employee or single approver)
 */
const queueLeaveCancellationEmail = async (
  recipient,
  employee,
  leaveRequest,
  reason,
  isEmployeeRecipient = false
) => {
  const { addEmailJob } = getQueueManager();
  return await addEmailJob(JOB_TYPES.EMAIL_LEAVE_CANCELLATION, {
    recipient,
    employee,
    leaveRequest,
    reason,
    isEmployeeRecipient,
  });
};

/**
 * Queue cancellation notification emails to multiple approvers/admins
 */
const queueLeaveCancellationEmails = async (recipients, employee, leaveRequest, reason) => {
  if (!Array.isArray(recipients) || recipients.length === 0) return [];
  const { addBulkEmailJobs } = getQueueManager();
  const jobs = recipients.map((recipient) => ({
    jobType: JOB_TYPES.EMAIL_LEAVE_CANCELLATION,
    data: {
      recipient,
      employee,
      leaveRequest,
      reason,
      isEmployeeRecipient: false,
    },
  }));
  return await addBulkEmailJobs(jobs);
};

/**
 * Queue a password reset email
 */
const queuePasswordResetEmail = async (email, resetUrl) => {
  const { addEmailJob } = getQueueManager();
  return await addEmailJob(JOB_TYPES.EMAIL_PASSWORD_RESET, {
    email,
    resetUrl,
  });
};

// ===================================================
// Helper functions
// ===================================================

const getLeaveTypeName = (type) => {
  if (!type) return "ลา";
  if (type.name) return type.name;
  const types = { sick: "ลาป่วย", personal: "ลากิจ", vacation: "ลาพักร้อน" };
  return types[type] || type.toString();
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

module.exports = {
  // Direct send functions
  sendNotificationEmail,
  sendLeaveRequestEmail,
  sendApprovalEmail,
  sendPasswordResetEmail,
  sendLeaveApprovedAdminNotificationEmail,
  sendLeaveCancellationEmail,

  // Asynchronous Queue dispatch functions
  queueLeaveRequestEmail,
  queueLeaveRequestEmails,
  queueApprovalEmail,
  queueLeaveApprovedAdminNotificationEmail,
  queueLeaveApprovedAdminNotificationEmails,
  queueLeaveCancellationEmail,
  queueLeaveCancellationEmails,
  queuePasswordResetEmail,
};

