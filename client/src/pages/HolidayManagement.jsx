import React, { useState, useEffect } from "react";
import { holidaysAPI } from "../services/api";
import { useToast } from "../components/common/Toast";
import Loading from "../components/common/Loading";
import {
  FaCalendarAlt,
  FaCalendarPlus,
  FaPlus,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import "./HolidayManagement.css";

const HolidayManagement = () => {
  const toast = useToast();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    description: "",
  });

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const response = await holidaysAPI.getAll();
      setHolidays(response.data);
    } catch (error) {
      console.error("Error fetching holidays:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    const confirmed = await toast.confirm(
      "ต้องการเพิ่มวันหยุดราชการประจำปีหรือไม่?"
    );
    if (!confirmed) return;
    try {
      await holidaysAPI.initialize();
      fetchHolidays();
      toast.success("เพิ่มวันหยุดราชการเรียบร้อยแล้ว");
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const openModal = (holiday = null) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        name: holiday.name,
        date: new Date(holiday.date).toISOString().split("T")[0],
        description: holiday.description || "",
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        name: "",
        date: "",
        description: "",
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingHoliday) {
        await holidaysAPI.update(
          editingHoliday.id || editingHoliday._id,
          formData
        );
        toast.success("แก้ไขวันหยุดเรียบร้อยแล้ว");
      } else {
        await holidaysAPI.create(formData);
        toast.success("เพิ่มวันหยุดเรียบร้อยแล้ว");
      }
      fetchHolidays();
      setModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await toast.confirm("คุณต้องการลบวันหยุดนี้หรือไม่?");
    if (!confirmed) return;
    try {
      await holidaysAPI.delete(id);
      fetchHolidays();
      toast.success("ลบวันหยุดเรียบร้อยแล้ว");
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
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
      <div className="holiday-management-page">
        <div className="page-header">
          <div>
            <h1>จัดการวันหยุด</h1>
            <p>จัดการวันหยุดราชการ ({holidays.length} วัน)</p>
          </div>
          <div className="header-actions">
            <button className="init-btn" onClick={handleInitialize}>
              <FaCalendarPlus style={{ marginRight: "6px" }} />{" "}
              เพิ่มวันหยุดราชการประจำปี
            </button>
            <button className="add-btn" onClick={() => openModal()}>
              <FaPlus style={{ marginRight: "6px" }} /> เพิ่มวันหยุด
            </button>
          </div>
        </div>

        {holidays.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <FaCalendarAlt size={48} />
            </span>
            <h3>ยังไม่มีวันหยุด</h3>
            <p>คลิก "เพิ่มวันหยุดราชการประจำปี" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="holidays-grid">
            {holidays.map((holiday) => (
              <div key={holiday.id || holiday._id} className="holiday-card">
                <div className="holiday-date">
                  <span className="date-day">
                    {new Date(holiday.date).getDate()}
                  </span>
                  <span className="date-month">
                    {new Date(holiday.date).toLocaleDateString("th-TH", {
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="holiday-info">
                  <h4>{holiday.name}</h4>
                  <p>{formatDate(holiday.date)}</p>
                  {holiday.description && (
                    <span className="holiday-desc">{holiday.description}</span>
                  )}
                </div>
                <div className="holiday-actions">
                  <button
                    className="edit-btn"
                    onClick={() => openModal(holiday)}
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(holiday.id || holiday._id)}
                  >
                    <FaTrash />
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
                {editingHoliday ? (
                  <>
                    <FaEdit style={{ marginRight: "8px" }} /> แก้ไขวันหยุด
                  </>
                ) : (
                  <>
                    <FaPlus style={{ marginRight: "8px" }} /> เพิ่มวันหยุด
                  </>
                )}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>ชื่อวันหยุด</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="เช่น วันสงกรานต์"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>วันที่</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>คำอธิบาย (ถ้ามี)</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="เช่น Songkran Festival"
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
                    {editingHoliday ? "บันทึก" : "เพิ่ม"}
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

export default HolidayManagement;
