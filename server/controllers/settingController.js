const { Setting } = require("../models");
const { getEmailSender, DEFAULT_FROM_NAME } = require("../services/emailService");

// @desc    Get email sender settings
// @route   GET /api/settings/email
// @access  Private/Admin
const getEmailSettings = async (req, res) => {
  try {
    const sender = await getEmailSender();
    res.json({
      emailFrom: sender.email,
      emailFromName: sender.name,
      apiKeyConfigured: Boolean(process.env.BREVO_API_KEY),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Update email sender settings
// @route   PUT /api/settings/email
// @access  Private/Admin
const updateEmailSettings = async (req, res) => {
  try {
    const emailFrom = String(req.body.emailFrom || "").trim();
    const emailFromName = String(req.body.emailFromName || "").trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailFrom) || emailFrom.length > 254) {
      return res.status(400).json({ message: "รูปแบบอีเมลผู้ส่งไม่ถูกต้อง" });
    }
    if (emailFromName.length > 100) {
      return res.status(400).json({ message: "ชื่อผู้ส่งต้องไม่เกิน 100 ตัวอักษร" });
    }

    await Setting.upsert({ key: "emailFrom", value: emailFrom });
    await Setting.upsert({ key: "emailFromName", value: emailFromName || null });

    res.json({ emailFrom, emailFromName: emailFromName || DEFAULT_FROM_NAME });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { getEmailSettings, updateEmailSettings };
