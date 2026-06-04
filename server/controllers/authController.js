const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  User,
  LeaveBalance,
  LeaveType,
  Department,
  Faculty,
} = require("../models");
const { Op } = require("sequelize");

// Generate JWT - Reduced expiry for better security
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d", // Reduced from 30d for security
  });
};

/**
 * Helper: สร้าง include สำหรับ leaveBalances (ปีปัจจุบัน + LeaveType)
 */
const getLeaveBalancesInclude = () => {
  const currentYear = new Date().getFullYear();
  return {
    model: LeaveBalance,
    as: "leaveBalances",
    where: { year: currentYear },
    required: false,
    include: [
      {
        model: LeaveType,
        as: "leaveType",
        attributes: ["id", "name", "code", "defaultDays"],
      },
    ],
  };
};

// Note: User registration is handled by admin only via userController.createUser
// See routes/users.js and controllers/userController.js

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user with associations
    const user = await User.findOne({
      where: { email },
      include: [
        getLeaveBalancesInclude(),
        {
          model: Department,
          as: "department",
        },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: "บัญชีนี้ถูกระงับการใช้งาน" });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);

    if (isPasswordValid) {
      res.json({
        id: user.id,
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        position: user.position,
        role: user.role,
        leaveBalances: user.leaveBalances,
        governmentDivision: user.governmentDivision,
        documentNumber: user.documentNumber,
        unit: user.unit,
        affiliation: user.affiliation,
        startDate: user.startDate,
        profileImage: user.profileImage,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: User,
          as: "supervisor",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        getLeaveBalancesInclude(),
        {
          model: Department,
          as: "department",
          include: [
            {
              model: Faculty,
              as: "faculty",
            },
          ],
        },
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // For security, don't confirm if the email exists, but tell the user we sent the link anyway
      return res.status(200).json({
        message: "ระบบได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลที่ระบุเรียบร้อยแล้ว (หากมีอีเมลนี้ในระบบ)",
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");

    // Set token expiration (1 hour)
    const expires = new Date(Date.now() + 3600 * 1000);

    // Save to user model
    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await user.save();

    // Create reset URL
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Log the link to the console for easy local development/testing
    console.log(`\n==================================================`);
    console.log(`[PASSWORD RESET] Link generated for ${user.email}:`);
    console.log(`${resetUrl}`);
    console.log(`==================================================\n`);

    // Send email using emailService
    const { sendPasswordResetEmail } = require("../services/emailService");
    const emailSent = await sendPasswordResetEmail(user.email, resetUrl);

    if (!emailSent) {
      // Allow testing locally via console log even if SMTP is misconfigured or fails
      if (process.env.NODE_ENV === "development") {
        console.warn("SMTP email sending failed, but continuing in development mode because the reset link was printed above.");
      } else {
        // Clean up token if sending fails in production
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งอีเมล กรุณาลองใหม่อีกครั้ง" });
      }
    }

    res.json({
      message: "ระบบได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลที่ระบุเรียบร้อยแล้ว (หากมีอีเมลนี้ในระบบ)",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      return res.status(400).json({ message: "ไม่พบ Token สำหรับตั้งรหัสผ่านใหม่" });
    }

    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "กรุณากรอกรหัสผ่านใหม่" });
    }

    // Passwords must be at least 8 characters
    if (password.length < 8) {
      return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    }

    // Password regex (at least one lowercase, one uppercase, one digit)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลขอย่างน้อยอย่างละ 1 ตัว",
      });
    }

    // Find user by valid token and expiration
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          [Op.gt]: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ message: "ลิงก์ตั้งรหัสผ่านใหม่ไม่ถูกต้องหรือหมดอายุแล้ว" });
    }

    // Update password
    user.password = password; // Hashed by hook
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "ตั้งรหัสผ่านใหม่เสร็จเรียบร้อยแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { login, getMe, forgotPassword, resetPassword };
