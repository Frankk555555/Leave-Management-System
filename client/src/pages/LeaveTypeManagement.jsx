import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { leaveTypesAPI, reportsAPI } from "../services/api";
import { useLeaveTypes } from "../hooks/queries/useReferenceData";
import { useToast } from "../components/common/Toast";
import Loading from "../components/common/Loading";
import {
  FaHospital,
  FaClipboardList,
  FaUmbrellaBeach,
  FaBaby,
  FaUserFriends,
  FaChild,
  FaPray,
  FaMedal,
  FaFileAlt,
  FaSyncAlt,
  FaEdit,
  FaPlus,
} from "react-icons/fa";
import "./LeaveTypeManagement.css";

const LeaveTypeManagement = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: leaveTypes = [], isLoading: loading } = useLeaveTypes();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "sick",
    description: "",
    defaultDays: 10,
  });


  // รีเซ็ตวันลาของบุคลากรทุกคน
  const [resetting, setResetting] = useState(false);

  const handleResetYearly = async () => {
    const confirmed = await toast.confirm(
      "คุณแน่ใจหรือไม่ที่จะรีเซ็ตวันลาของบุคลากรทุกคน?",
      "ยืนยันการรีเซ็ตวันลา"
    );
    if (!confirmed) return;
    setResetting(true);
    try {
      const response = await reportsAPI.resetYearly();
      toast.success(
        `${response.data.message} อัปเดตแล้ว ${response.data.updatedCount} คน`
      );
    } catch (error) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setResetting(false);
    }
  };

  const handleInitialize = async () => {
    const confirmed = await toast.confirm(
      "ต้องการเพิ่มประเภทการลาเริ่มต้นหรือไม่?"
    );
    if (!confirmed) return;
    try {
      await leaveTypesAPI.initialize();
      queryClient.invalidateQueries(["leaveTypes"]);
      toast.success("เพิ่มประเภทการลาเริ่มต้นเรียบร้อยแล้ว");
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.type === "number" ? parseInt(e.target.value) : e.target.value,
    });
  };

  const openModal = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        code: type.code,
        description: type.description || "",
        defaultDays: type.defaultDays,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: "",
        code: "sick",
        description: "",
        defaultDays: 10,
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingType) {
        await leaveTypesAPI.update(editingType.id || editingType._id, formData);
        toast.success("แก้ไขประเภทการลาเรียบร้อยแล้ว");
      } else {
        await leaveTypesAPI.create(formData);
        toast.success("เพิ่มประเภทการลาเรียบร้อยแล้ว");
      }
      queryClient.invalidateQueries(["leaveTypes"]);
      setModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await toast.confirm("คุณต้องการลบประเภทการลานี้หรือไม่?");
    if (!confirmed) return;
    try {
      await leaveTypesAPI.delete(id);
      queryClient.invalidateQueries(["leaveTypes"]);
      toast.success("ลบประเภทการลาเรียบร้อยแล้ว");
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const getTypeIcon = (code) => {
    const iconProps = { size: 24, color: "white" };
    const icons = {
      sick: <FaHospital {...iconProps} />,
      personal: <FaClipboardList {...iconProps} />,
      vacation: <FaUmbrellaBeach {...iconProps} />,
      maternity: <FaBaby {...iconProps} />,
      paternity: <FaUserFriends {...iconProps} />,
      childcare: <FaChild {...iconProps} />,
      ordination: <FaPray {...iconProps} />,
      military: <FaMedal {...iconProps} />,
    };
    return icons[code] || <FaFileAlt {...iconProps} />;
  };

  const getTypeColor = (code) => {
    const colors = {
      sick: "linear-gradient(135deg, #059669, #10b981)",
      personal: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      vacation: "linear-gradient(135deg, #f59e0b, #fbbf24)",
      maternity: "linear-gradient(135deg, #ec4899, #f472b6)",
      paternity: "linear-gradient(135deg, #0891b2, #22d3ee)",
      childcare: "linear-gradient(135deg, #14b8a6, #5eead4)",
      ordination: "linear-gradient(135deg, #ea580c, #fb923c)",
      military: "linear-gradient(135deg, #3b82f6, #60a5fa)",
    };
    return colors[code] || colors.sick;
  };

  if (loading) {
    return (
      <>
        <Loading size="fullpage" text="กำลังโหลด..." />
      </>
    );
  }

  return (
    <>
      <div className="leave-type-management-page">
        <div className="page-header">
          <div>
            <h1>จัดการประเภทการลา</h1>
            <p>กำหนดประเภทและจำนวนวันลาตามระเบียบราชการ</p>
          </div>
          <div className="header-actions">
            <button className="init-btn" onClick={handleInitialize}>
              <FaSyncAlt style={{ marginRight: "6px" }} /> รีเซ็ตเป็นค่าเริ่มต้น
            </button>
            <button
              className="reset-btn"
              onClick={handleResetYearly}
              disabled={resetting}
            >
              <FaSyncAlt style={{ marginRight: "6px" }} />
              {resetting ? "กำลังรีเซ็ต..." : "รีเซ็ตวันลาบุคลากร"}
            </button>
          </div>
        </div>

        {/* คำแนะนำการใช้งาน */}
        <div className="info-guide">
          <ul>
            <li>
              <strong>ปุ่ม "รีเซ็ตเป็นค่าเริ่มต้น":</strong>{" "}
              คืนค่าประเภทการลาทั้งหมดกลับเป็นค่า default ตามระเบียบราชการ
            </li>
            <li>
              <strong>ปุ่ม "รีเซ็ตวันลาบุคลากร":</strong>{" "}
              ล้างสถิติการลาของพนักงานทุกคน (ใช้ตอนขึ้นปีงบประมาณใหม่)
            </li>
          </ul>
        </div>

        {leaveTypes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <FaFileAlt size={48} />
            </span>
            <h3>ยังไม่มีประเภทการลา</h3>
            <p>คลิก "รีเซ็ตเป็นค่าเริ่มต้น" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="leave-types-grid">
            {leaveTypes.map((type) => (
              <div key={type.id || type._id} className="leave-type-card">
                <div
                  className="type-header"
                  style={{ background: getTypeColor(type.code) }}
                >
                  <span className="type-icon">{getTypeIcon(type.code)}</span>
                  <h3>{type.name}</h3>
                </div>
                <div className="type-body">
                  <div className="type-stat">
                    <span className="stat-value">{type.defaultDays}</span>
                    <span className="stat-label">วันต่อปี</span>
                  </div>
                  <p className="type-description">
                    {type.description || "ไม่มีคำอธิบาย"}
                  </p>
                </div>
                <div className="type-actions">
                  <button className="edit-btn" onClick={() => openModal(type)}>
                    <FaEdit style={{ marginRight: "4px" }} /> แก้ไข
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {modalOpen && (
          <div className="modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>
                {editingType ? (
                  <>
                    <FaEdit style={{ marginRight: "8px" }} /> แก้ไขประเภทการลา
                  </>
                ) : (
                  <>
                    <FaPlus style={{ marginRight: "8px" }} /> เพิ่มประเภทการลา
                  </>
                )}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>ชื่อประเภท</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="เช่น ลาป่วย"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>รหัส</label>
                    <select
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      disabled={!!editingType}
                    >
                      <option value="sick">sick (ลาป่วย)</option>
                      <option value="personal">personal (ลากิจ)</option>
                      <option value="vacation">vacation (ลาพักผ่อน)</option>
                      <option value="maternity">maternity (ลาคลอดบุตร)</option>
                      <option value="paternity">
                        paternity (ลาช่วยภรรยาคลอด)
                      </option>
                      <option value="childcare">
                        childcare (ลาเลี้ยงดูบุตร)
                      </option>
                      <option value="ordination">ordination (ลาอุปสมบท)</option>
                      <option value="military">military (ลาตรวจเลือก)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>จำนวนวันต่อปี</label>
                    <input
                      type="number"
                      name="defaultDays"
                      value={formData.defaultDays}
                      onChange={handleChange}
                      min={0}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>คำอธิบาย</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="คำอธิบายประเภทการลา"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setModalOpen(false)}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="submit-btn">
                    {editingType ? "บันทึก" : "เพิ่ม"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LeaveTypeManagement;
