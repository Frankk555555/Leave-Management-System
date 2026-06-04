import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authAPI } from "../services/api";
import { useToast } from "../components/common/Toast";
import SEO, { SEOConfig } from "../components/common/SEO";
import "./Login.css"; // Reuse login layout styles for consistency

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.forgotPassword(email);
      toast.success(response.data?.message || "ส่งลิงก์ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว");
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "เกิดข้อผิดพลาดในการส่งคำขอ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO {...SEOConfig.forgotPassword} />
      <div className="login-container">
        <div className="login-background">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>

        <div className="login-card">
          <div className="login-header">
            <div className="logo">🔒</div>
            <h1>ลืมรหัสผ่าน</h1>
            <p>กรอกอีเมลของคุณเพื่อรับลิงก์สำหรับตั้งรหัสผ่านใหม่</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email">อีเมล</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "กำลังส่งข้อมูล..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
              </button>
            </form>
          ) : (
            <div className="success-state" style={{ textAlign: "center", marginTop: "1rem" }}>
              <div className="success-icon" style={{ fontSize: "3rem", marginBottom: "1rem" }}>✉️</div>
              <h3 style={{ color: "#2d3748", marginBottom: "0.5rem" }}>ส่งลิงก์กู้คืนรหัสผ่านแล้ว</h3>
              <p style={{ color: "#718096", fontSize: "0.95rem", lineHeight: "1.5" }}>
                ระบบได้ส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยัง <strong>{email}</strong> เรียบร้อยแล้ว โปรดตรวจสอบกล่องข้อความในอีเมลของคุณ (รวมถึงกล่องอีเมลขยะ)
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

export default ForgotPassword;
