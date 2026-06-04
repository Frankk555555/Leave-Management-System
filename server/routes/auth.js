const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { login, getMe, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "ข้อมูลไม่ถูกต้อง",
      errors: errors.array(),
    });
  }
  next();
};

// Login validation rules
const loginValidation = [
  body("email").isEmail().withMessage("รูปแบบอีเมลไม่ถูกต้อง").normalizeEmail(),
  body("password").notEmpty().withMessage("กรุณากรอกรหัสผ่าน"),
];

// Forgot Password validation rules
const forgotPasswordValidation = [
  body("email").isEmail().withMessage("รูปแบบอีเมลไม่ถูกต้อง").normalizeEmail(),
];

// Reset Password validation rules
const resetPasswordValidation = [
  body("token").notEmpty().withMessage("ไม่พบ Token สำหรับตั้งรหัสผ่านใหม่"),
  body("password").isLength({ min: 8 }).withMessage("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"),
];

// Note: Registration is only available through admin user management
// POST /api/users (admin only) - see routes/users.js

router.post("/login", loginValidation, validate, login);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPasswordValidation, validate, forgotPassword);
router.post("/reset-password", resetPasswordValidation, validate, resetPassword);

module.exports = router;
