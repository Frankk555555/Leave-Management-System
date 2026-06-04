const nodemailer = require("nodemailer");

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send notification email
const sendNotificationEmail = async (to, subject, html) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log("Email not configured, skipping...");
      return false;
    }

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"ระบบบริหารการลา" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

// Email templates
const sendLeaveRequestEmail = async (supervisor, employee, leaveRequest) => {
  const subject = `[คำขอลา] ${employee.firstName} ${
    employee.lastName
  } - ${getLeaveTypeName(leaveRequest.leaveType)}`;
  const html = `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 20px; border-radius: 10px 10px 0 0;">
        <h2 style="color: white; margin: 0;">📝 คำขอลาใหม่</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e2e8f0;">
        <p><strong>พนักงาน:</strong> ${employee.firstName} ${
    employee.lastName
  }</p>
        <p><strong>แผนก:</strong> ${employee.department?.name || employee.department || "-"}</p>
        <p><strong>ประเภทการลา:</strong> ${getLeaveTypeName(
          leaveRequest.leaveType
        )}</p>
        <p><strong>วันที่:</strong> ${formatDate(
          leaveRequest.startDate
        )} - ${formatDate(leaveRequest.endDate)}</p>
        <p><strong>จำนวนวัน:</strong> ${leaveRequest.totalDays} วัน</p>
        <p><strong>เหตุผล:</strong> ${leaveRequest.reason}</p>
        <div style="margin-top: 20px;">
          <a href="${
            process.env.FRONTEND_URL || "http://localhost:5173"
          }/approvals" 
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            ดูรายละเอียดและอนุมัติ
          </a>
        </div>
      </div>
    </div>
  `;

  return sendNotificationEmail(supervisor.email, subject, html);
};

const sendApprovalEmail = async (employee, leaveRequest, isApproved, note) => {
  const status = isApproved ? "อนุมัติแล้ว ✅" : "ไม่อนุมัติ ❌";
  const subject = `[${status}] คำขอลา${getLeaveTypeName(
    leaveRequest.leaveType
  )}ของคุณ`;
  const html = `
    <div style="font-family: 'Sarabun', sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${
        isApproved
          ? "linear-gradient(135deg, #11998e, #38ef7d)"
          : "linear-gradient(135deg, #ff6b6b, #ee5a5a)"
      }; padding: 20px; border-radius: 10px 10px 0 0;">
        <h2 style="color: white; margin: 0;">${
          isApproved ? "✅ อนุมัติแล้ว" : "❌ ไม่อนุมัติ"
        }</h2>
      </div>
      <div style="background: white; padding: 20px; border: 1px solid #e2e8f0;">
        <p>คำขอลาของคุณได้รับการ${isApproved ? "อนุมัติ" : "ปฏิเสธ"}แล้ว</p>
        <p><strong>ประเภทการลา:</strong> ${getLeaveTypeName(
          leaveRequest.leaveType
        )}</p>
        <p><strong>วันที่:</strong> ${formatDate(
          leaveRequest.startDate
        )} - ${formatDate(leaveRequest.endDate)}</p>
        <p><strong>จำนวนวัน:</strong> ${leaveRequest.totalDays} วัน</p>
        ${note ? `<p><strong>หมายเหตุ:</strong> ${note}</p>` : ""}
        <div style="margin-top: 20px;">
          <a href="${
            process.env.FRONTEND_URL || "http://localhost:5173"
          }/leave-history" 
             style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            ดูประวัติการลา
          </a>
        </div>
      </div>
    </div>
  `;

  return sendNotificationEmail(employee.email, subject, html);
};

// Helper functions
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
        <p>กรุณาคลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ภายใน 1 ชั่วโมงหลังจากได้รับอีเมลนี้:</p>
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

module.exports = {
  sendNotificationEmail,
  sendLeaveRequestEmail,
  sendApprovalEmail,
  sendPasswordResetEmail,
};
