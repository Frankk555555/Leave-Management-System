import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authAPI } from "../services/api";
import { useToast } from "../components/common/Toast";
import SEO, { SEOConfig } from "../components/common/SEO";
import "./Login.css"; // Reuse login layout styles for consistency

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const validatePasswordStrength = (pass) => {
    if (pass.length < 8) {
      return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    }
    const hasLowercase = /[a-z]/.test(pass);
    const hasUppercase = /[A-Z]/.test(pass);
    const hasDigit = /\d/.test(pass);
    if (!hasLowercase || !hasUppercase || !hasDigit) {
      return "รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลขอย่างน้อยอย่างละ 1 ตัว";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error("ไม่พบรหัส Token สำหรับตั้งรหัสผ่านใหม่ กรุณาตรวจสอบลิงก์จากอีเมลอีกครั้ง");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("รหัสผ่านไม่ตรงกัน");
      return;
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      toast.error(strengthError);
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.resetPassword(token, password);
      toast.success(response.data?.message || "ตั้งรหัสผ่านใหม่เสร็จเรียบร้อยแล้ว");
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการตั้งรหัสผ่านใหม่ ลิงก์อาจหมดอายุแล้ว");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO {...SEOConfig.resetPassword} />
      <div className="login-container">
        <div className="login-background">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <div className="logo">🔑</div>
            <h1>ตั้งรหัสผ่านใหม่</h1>
            <p>กำหนดรหัสผ่านใหม่สำหรับบัญชีผู้ใช้งานของคุณ</p>
          </div>

          {!token ? (
            <div className="error-state" style={{ textAlign: "center", marginTop: "1rem" }}>
              <div className="error-icon" style={{ fontSize: "3rem", marginBottom: "1rem" }}>❌</div>
              <h3 style={{ color: "#e53e3e", marginBottom: "0.5rem" }}>ไม่พบรหัสสำหรับตั้งค่าใหม่</h3>
              <p style={{ color: "#718096", fontSize: "0.95rem" }}>
                ลิงก์สำหรับรีเซ็ตรหัสผ่านไม่ถูกต้อง หรือคุณไม่ได้เข้าใช้งานผ่านลิงก์ที่ระบบส่งให้ทางอีเมล
              </p>
            </div>
          ) : !submitted ? (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="password">รหัสผ่านใหม่</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="ยืนยันรหัสผ่านใหม่"
                  required
                />
              </div>

              <div className="password-hint" style={{ fontSize: "0.8rem", color: "#a0aec0", lineHeight: "1.4", margin: "0.25rem 0" }}>
                * รหัสผ่านต้องประกอบด้วยตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลขอย่างน้อยอย่างละ 1 ตัว และมีความยาวอย่างน้อย 8 ตัวอักษร
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "กำลังตั้งรหัสผ่านใหม่..." : "ตั้งรหัสผ่านใหม่"}
              </button>
            </form>
          ) : (
            <div className="success-state" style={{ textAlign: "center", marginTop: "1rem" }}>
              <div className="success-icon" style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
              <h3 style={{ color: "#38a169", marginBottom: "0.5rem" }}>ตั้งรหัสผ่านเสร็จสมบูรณ์</h3>
              <p style={{ color: "#718096", fontSize: "0.95rem", lineHeight: "1.5" }}>
                รหัสผ่านใหม่ของคุณได้รับการบันทึกแล้ว คุณสามารถกลับไปเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที
              </p>
            </div>
          )}

          <div className="login-footer" style={{ marginTop: "2rem" }}>
            <p>
              <Link to="/login" style={{ color: "#667eea", textDecoration: "none", fontWeight: "bold" }}>
                ← กลับไปหน้าเข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
