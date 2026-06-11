import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { leaveRequestsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/common/Toast";
import "./LeaveRequest.css";

// React Icons
import {
  FaHospital,
  FaClipboardList,
  FaUmbrellaBeach,
  FaBaby,
  FaUserFriends,
  FaChild,
  FaPray,
  FaMedal,
  FaEdit,
  FaPaperclip,
  FaFileAlt,
  FaInfoCircle,
  FaTimes,
  FaCheckCircle,
} from "react-icons/fa";

const LeaveRequest = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    leaveType: "sick",
    startDate: "",
    endDate: "",
    reason: "",
    childBirthDate: "",
    ceremonyDate: "",
    hasMedicalCertificate: false,
    isLongTermSick: false,
    timeSlot: "full", // full, morning, afternoon
  });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false); // แสดง popup สำเร็จ

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles].slice(0, 5));
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ประเภทลาที่นับเฉพาะวันทำการ (ไม่รวมเสาร์-อาทิตย์)
  const WORKING_DAYS_ONLY = [
    "sick",
    "personal",
    "vacation",
    "paternity",
    "maternity",
    "childcare",
    "ordination",
  ];

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) return 0;

    // เช็คว่าลาครึ่งวันหรือไม่
    if (
      formData.startDate === formData.endDate &&
      (formData.timeSlot === "morning" || formData.timeSlot === "afternoon")
    ) {
      return 0.5;
    }

    // ถ้าเป็นประเภทลาที่นับเฉพาะวันทำการ
    if (WORKING_DAYS_ONLY.includes(formData.leaveType)) {
      let workingDays = 0;
      const current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        // ไม่ใช่เสาร์ (6) หรืออาทิตย์ (0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++;
        }
        current.setDate(current.getDate() + 1);
      }
      return workingDays;
    }

    // ประเภทลาอื่นๆ นับรวมวันหยุด
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  };

  const getRemainingBalance = (code) => {
    if (code === "military") return "ไม่จำกัด";
    if (!user?.leaveBalances || !Array.isArray(user.leaveBalances)) return 0;
    const balance = user.leaveBalances.find((b) => b.leaveType?.code === code);
    if (!balance) return 0;
    return (
      parseFloat(balance.totalDays || 0) +
      parseFloat(balance.carriedOverDays || 0) -
      parseFloat(balance.usedDays || 0)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const days = calculateDays();
    if (days <= 0) {
      toast.warning("กรุณาเลือกวันที่ให้ถูกต้อง");
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("leaveType", formData.leaveType);
      formDataToSend.append("startDate", formData.startDate);
      formDataToSend.append("endDate", formData.endDate);
      formDataToSend.append("reason", formData.reason);

      // Add conditional fields
      if (formData.leaveType === "paternity" && formData.childBirthDate) {
        formDataToSend.append("childBirthDate", formData.childBirthDate);
      }
      if (formData.leaveType === "ordination" && formData.ceremonyDate) {
        formDataToSend.append("ceremonyDate", formData.ceremonyDate);
      }
      if (formData.leaveType === "sick") {
        formDataToSend.append(
          "hasMedicalCertificate",
          formData.hasMedicalCertificate
        );
        formDataToSend.append("isLongTermSick", formData.isLongTermSick);
      }

      // Add timeSlot
      if (formData.startDate === formData.endDate) {
        formDataToSend.append("timeSlot", formData.timeSlot);
      } else {
        formDataToSend.append("timeSlot", "full");
      }

      files.forEach((file) => {
        formDataToSend.append("attachments", file);
      });

      await leaveRequestsAPI.create(formDataToSend);

      // แสดง popup สำเร็จ
      setShowSuccessModal(true);
    } catch (err) {
      setError(err.response?.data?.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  // ปิด modal และไปหน้าประวัติ
  const handleCloseModal = () => {
    setShowSuccessModal(false);
    navigate("/leave-history");
  };

  const leaveTypes = [
    {
      value: "sick",
      label: "ลาป่วย",
      icon: <FaHospital />,
      color: "#11998e",
      days: 60,
    },
    {
      value: "personal",
      label: "ลากิจส่วนตัว",
      icon: <FaClipboardList />,
      color: "#667eea",
      days: 45,
    },
    {
      value: "vacation",
      label: "ลาพักผ่อน",
      icon: <FaUmbrellaBeach />,
      color: "#f6d365",
      days: 10,
    },
    {
      value: "maternity",
      label: "ลาคลอดบุตร",
      icon: <FaBaby />,
      color: "#ff6b9d",
      days: 90,
    },
    {
      value: "paternity",
      label: "ลาช่วยภรรยาคลอด",
      icon: <FaUserFriends />,
      color: "#4facfe",
      days: 15,
    },
    {
      value: "childcare",
      label: "ลาเลี้ยงดูบุตร",
      icon: <FaChild />,
      color: "#a8edea",
      days: 150,
    },
    {
      value: "ordination",
      label: "ลาอุปสมบท/ฮัจย์",
      icon: <FaPray />,
      color: "#ffecd2",
      days: 120,
    },
    {
      value: "military",
      label: "ลาตรวจเลือก",
      icon: <FaMedal />,
      color: "#667eea",
      days: "ไม่จำกัด",
    },
  ];

  const getLeaveInfo = () => {
    const type = formData.leaveType;
    switch (type) {
      case "sick":
        return "ลาป่วยตั้งแต่ 30 วันขึ้นไป ต้องมีใบรับรองแพทย์";
      case "maternity":
        return "ลาคลอดบุตรได้ไม่เกิน 90 วัน ไม่ต้องใบรับรองแพทย์";
      case "paternity":
        return "ลาช่วยภรรยาคลอดได้ 15 วันทำการ ภายใน 90 วันหลังคลอด";
      case "childcare":
        return "ลาเลี้ยงดูบุตรต่อเนื่องจากลาคลอด ไม่ได้รับเงินเดือน";
      case "ordination":
        return "ต้องยื่นคำขอล่วงหน้าอย่างน้อย 60 วัน";
      case "military":
        return "รายงานภายใน 48 ชม. อนุมัติอัตโนมัติ";
      case "personal":
        return "ปีแรก 15 วัน / ปีถัดไป 45 วัน";
      case "vacation":
        return "สะสมได้ไม่เกิน 20-30 วันตามอายุงาน";
      default:
        return "";
    }
  };

  return (
    <>
      <div className="leave-request-page">
        <div className="page-header">
          <h1>
              ยื่นคำขอลา
          </h1>
          <p>กรอกข้อมูลการลาของคุณ</p>
        </div>

        <div className="leave-request-container">
          <form onSubmit={handleSubmit} className="leave-form">
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-section">
              <h3>ประเภทการลา</h3>
              <div className="leave-type-grid">
                {leaveTypes.map((type) => (
                  <label
                    key={type.value}
                    className={`leave-type-card ${
                      formData.leaveType === type.value ? "selected" : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="leaveType"
                      value={type.value}
                      checked={formData.leaveType === type.value}
                      onChange={handleChange}
                    />
                    <span
                      className="type-icon"
                      style={{ background: type.color }}
                    >
                      {type.icon}
                    </span>
                    <span className="type-label">{type.label}</span>
                    <span className="type-balance">
                      {type.days === "ไม่จำกัด"
                        ? "ไม่จำกัด"
                        : `เหลือ ${
                            getRemainingBalance(type.value) || type.days
                          } วัน`}
                    </span>
                  </label>
                ))}
              </div>
              {getLeaveInfo() && (
                <div className="leave-info-box">
                  <FaInfoCircle style={{ marginRight: "0.5rem" }} />{" "}
                  {getLeaveInfo()}
                </div>
              )}
            </div>

            {/* Conditional Fields */}
            {formData.leaveType === "paternity" && (
              <div className="form-section conditional-section">
                <h3>
                  <FaBaby style={{ marginRight: "0.5rem" }} />{" "}
                  วันที่ภรรยาคลอดบุตร
                </h3>
                <input
                  type="date"
                  name="childBirthDate"
                  value={formData.childBirthDate}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {formData.leaveType === "ordination" && (
              <div className="form-section conditional-section">
                <h3>
                  <FaPray style={{ marginRight: "0.5rem" }} />{" "}
                  วันที่อุปสมบท/เดินทางฮัจย์
                </h3>
                <input
                  type="date"
                  name="ceremonyDate"
                  value={formData.ceremonyDate}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {formData.leaveType === "sick" && (
              <div className="form-section conditional-section">
                <h3>
                  <FaHospital style={{ marginRight: "0.5rem" }} />{" "}
                  ข้อมูลเพิ่มเติม
                </h3>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="hasMedicalCertificate"
                    checked={formData.hasMedicalCertificate}
                    onChange={handleChange}
                  />
                  มีใบรับรองแพทย์
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isLongTermSick"
                    checked={formData.isLongTermSick}
                    onChange={handleChange}
                  />
                  ลาป่วยเพื่อรักษาตัวเป็นเวลานาน (120 วัน/ปี)
                </label>
              </div>
            )}

            <div className="form-section">
              <h3>ช่วงวันที่ลา</h3>
              <div className="date-range">
                <div className="form-group">
                  <label htmlFor="startDate">วันที่เริ่มต้น</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="date-separator">→</div>
                <div className="form-group">
                  <label htmlFor="endDate">วันที่สิ้นสุด</label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    min={formData.startDate}
                    required
                  />
                </div>
                <div className="days-count">
                  <span className="days-number">{calculateDays()}</span>
                  <span className="days-label">วัน</span>
                </div>
              </div>
            </div>

            {/* Time Slot Selection (Shows only when start date == end date) */}
            {formData.startDate &&
              formData.endDate &&
              formData.startDate === formData.endDate && (
                <div className="form-section">
                  <h3>ช่วงเวลา</h3>
                  <div className="time-slot-options">
                    <label
                      className={`time-slot-card ${
                        formData.timeSlot === "full" ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="timeSlot"
                        value="full"
                        checked={formData.timeSlot === "full"}
                        onChange={handleChange}
                      />
                      <span>เต็มวัน (1 วัน)</span>
                    </label>
                    <label
                      className={`time-slot-card ${
                        formData.timeSlot === "morning" ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="timeSlot"
                        value="morning"
                        checked={formData.timeSlot === "morning"}
                        onChange={handleChange}
                      />
                      <span>ครึ่งเช้า (0.5 วัน)</span>
                    </label>
                    <label
                      className={`time-slot-card ${
                        formData.timeSlot === "afternoon" ? "selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="timeSlot"
                        value="afternoon"
                        checked={formData.timeSlot === "afternoon"}
                        onChange={handleChange}
                      />
                      <span>ครึ่งบ่าย (0.5 วัน)</span>
                    </label>
                  </div>
                </div>
              )}

            <div className="form-section">
              <h3>เหตุผลการลา</h3>
              <textarea
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                placeholder="ระบุเหตุผลการลา..."
                rows={4}
                required
              />
            </div>

            <div className="form-section">
              <h3>เอกสารแนบ (ถ้ามี)</h3>
              <div
                className="file-upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  style={{ display: "none" }}
                />
                <div className="upload-icon">
                  <FaPaperclip />
                </div>
                <p>คลิกเพื่อเลือกไฟล์หรือลากไฟล์มาวาง</p>
                <span>รองรับ: JPG, PNG, PDF, DOC (สูงสุด 5 ไฟล์)</span>
              </div>

              {files.length > 0 && (
                <div className="file-list">
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <span className="file-icon">
                        <FaFileAlt />
                      </span>
                      <span className="file-name">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="remove-file"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "กำลังส่ง..." : "ยื่นคำขอลา"}
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal Popup */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">
              <FaCheckCircle />
            </div>
            <h2>ยื่นคำขอลาสำเร็จ!</h2>
            <p>คำขอลาของคุณถูกส่งเรียบร้อยแล้ว</p>
            <p>กรุณารอการอนุมัติจากหัวหน้างาน</p>
            <button className="modal-close-btn" onClick={handleCloseModal}>
              ไปหน้าประวัติการลา
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default LeaveRequest;
