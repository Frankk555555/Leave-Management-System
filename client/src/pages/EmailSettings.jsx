import React, { useEffect, useState } from "react";
import { FaEnvelope, FaSave } from "react-icons/fa";
import { settingsAPI } from "../services/api";
import { useToast } from "../components/common/Toast";
import Loading from "../components/common/Loading";
import SEO, { SEOConfig } from "../components/common/SEO";

const EmailSettings = () => {
  const toast = useToast();
  const [form, setForm] = useState({ emailFrom: "", emailFromName: "" });
  const [apiKeyConfigured, setApiKeyConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsAPI
      .getEmail()
      .then(({ data }) => {
        setForm({ emailFrom: data.emailFrom || "", emailFromName: data.emailFromName || "" });
        setApiKeyConfigured(data.apiKeyConfigured);
      })
      .catch(() => toast.error("ไม่สามารถโหลดการตั้งค่าอีเมลได้"))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await settingsAPI.updateEmail(form);
      setForm({ emailFrom: data.emailFrom, emailFromName: data.emailFromName });
      toast.success("บันทึกการตั้งค่าอีเมลเรียบร้อยแล้ว");
    } catch (error) {
      toast.error(error.response?.data?.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 640 }}>
      <SEO {...SEOConfig.emailSettings} />
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <h1>
          <FaEnvelope /> ตั้งค่าอีเมลผู้ส่ง
        </h1>
        <p>อีเมลที่ระบบใช้ส่งการแจ้งเตือนการลาและรีเซ็ตรหัสผ่าน (ผ่าน Brevo)</p>
      </div>

      {!apiKeyConfigured && (
        <p style={{ background: "#fef3c7", color: "#92400e", padding: "0.75rem 1rem", borderRadius: 10 }}>
          ยังไม่ได้ตั้งค่า BREVO_API_KEY บนเซิร์ฟเวอร์ ระบบจะยังไม่ส่งอีเมล
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label htmlFor="emailFrom">อีเมลผู้ส่ง</label>
          <input
            id="emailFrom"
            name="emailFrom"
            type="email"
            required
            maxLength={254}
            value={form.emailFrom}
            onChange={handleChange}
            placeholder="noreply@example.com"
          />
        </div>
        <div className="form-group" style={{ marginBottom: "0.75rem" }}>
          <label htmlFor="emailFromName">ชื่อผู้ส่ง</label>
          <input
            id="emailFromName"
            name="emailFromName"
            type="text"
            maxLength={100}
            value={form.emailFromName}
            onChange={handleChange}
            placeholder="ระบบบริหารการลา"
          />
        </div>
        <p style={{ color: "#6c757d", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          อีเมลผู้ส่งต้องเป็นอีเมลที่ยืนยัน (verified sender) ในบัญชี Brevo แล้ว มิฉะนั้นอีเมลจะส่งไม่ออก
        </p>
        <button type="submit" className="add-btn" disabled={saving}>
          <FaSave /> {saving ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </form>
    </div>
  );
};

export default EmailSettings;
