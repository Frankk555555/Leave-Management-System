import React, { useState, useEffect } from "react";
import Navbar from "../components/common/Navbar";
import Loading from "../components/common/Loading";
import { useToast } from "../components/common/Toast";
import { previewLeavePDF } from "../utils/generateLeavePDF";
import { getLeaveTypeName, getLeaveTypeCode } from "../utils/leaveTypeUtils";
import config from "../config";
import {
  FaCheck,
  FaClock,
  FaUser,
  FaCalendarAlt,
  FaFileAlt,
  FaSearch,
  FaFilter,
  FaTimes,
  FaEye,
} from "react-icons/fa";
import "./LeaveManagement.css";

const API_URL = config.API_URL;

const LeaveManagement = () => {
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmNote, setConfirmNote] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({ pending: 0, confirmed: 0, total: 0 });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/leave-requests/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRequests(data);

      // Calculate stats
      const pending = data.filter((r) => r.status === "pending").length;
      const confirmed = data.filter((r) => r.status === "confirmed").length;
      setStats({ pending, confirmed, total: data.length });
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = (request) => {
    setSelectedRequest(request);
    setConfirmNote("");
    setShowModal(true);
  };

  const handleConfirm = async () => {
    if (!selectedRequest) return;

    try {
      setConfirmingId(selectedRequest.id);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/api/leave-requests/${selectedRequest.id}/confirm`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ note: confirmNote }),
        },
      );

      if (!response.ok) {
        throw new Error("ไม่สามารถยืนยันการลาได้");
      }

      toast.success("ยืนยันการลงข้อมูลเรียบร้อยแล้ว");
      setShowModal(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setConfirmingId(null);
    }
  };

  const handlePreview = async (request) => {
    // คำนวณสถิติการลาก่อนหน้าของ user คนนี้ (confirmed leaves only)
    const userConfirmedRequests = requests.filter(
      (r) =>
        r.status === "confirmed" &&
        r.id !== request.id &&
        r.userId === request.userId,
    );

    const leaveStats = {
      sick: { used: 0 },
      personal: { used: 0 },
      vacation: { used: 0 },
      maternity: { used: 0 },
      paternity: { used: 0 },
      childcare: { used: 0 },
      ordination: { used: 0 },
      military: { used: 0 },
    };

    // รวมจำนวนวันลาที่ผ่านมา
    userConfirmedRequests.forEach((r) => {
      const code = getLeaveTypeCode(r.leaveType);
      if (leaveStats[code]) {
        leaveStats[code].used += r.totalDays || 0;
      }
    });

    // Prepare leave data
    const leaveData = {
      leaveType: getLeaveTypeCode(request.leaveType),
      startDate: request.startDate,
      endDate: request.endDate,
      totalDays: request.totalDays,
      reason: request.reason || "",
      contactAddress: request.contactAddress || "",
      contactPhone: request.contactPhone || "",
      leaveStats: leaveStats,
      createdAt: request.createdAt,
    };

    // Prepare user data
    const userData = {
      firstName: request.user?.firstName || "",
      lastName: request.user?.lastName || "",
      position: request.user?.position || "",
      department: request.user?.department || "",
      unit: request.user?.unit || "",
      affiliation: request.user?.affiliation || "",
      phone: request.user?.phone || "",
      documentNumber: request.user?.documentNumber || "",
      signatureImage: request.user?.signatureImage || "",
    };

    await previewLeavePDF(leaveData, userData);
  };

  // getLeaveTypeName imported from utils/leaveTypeUtils

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return <span className="status-badge pending">รอดำเนินการ</span>;
      case "confirmed":
        return <span className="status-badge confirmed">ลงข้อมูลแล้ว</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const filteredRequests = requests
    .filter((r) => {
      if (filter === "all") return true;
      return r.status === filter;
    })
    .filter((r) => {
      if (!searchTerm) return true;
      const name = `${r.user?.firstName} ${r.user?.lastName}`.toLowerCase();
      return name.includes(searchTerm.toLowerCase());
    });

  if (loading) {
    return (
      <>
        <Navbar />
        <Loading size="fullpage" text="กำลังโหลดข้อมูล..." />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="leave-management-page">
        <div className="page-header">
          <div>
            <h1>จัดการใบลา</h1>
            <p>ตรวจสอบและยืนยันการลงข้อมูลในระบบมหาวิทยาลัย</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card pending">
            <div className="stat-icon">
              <FaClock />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">รอดำเนินการ</span>
            </div>
          </div>
          <div className="stat-card confirmed">
            <div className="stat-icon">
              <FaCheck />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.confirmed}</span>
              <span className="stat-label">ลงข้อมูลแล้ว</span>
            </div>
          </div>
          <div className="stat-card total">
            <div className="stat-icon">
              <FaFileAlt />
            </div>
            <div className="stat-info">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">ใบลาทั้งหมด</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-container">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === "pending" ? "active" : ""}`}
              onClick={() => setFilter("pending")}
            >
              <FaClock /> รอดำเนินการ ({stats.pending})
            </button>
            <button
              className={`filter-btn ${filter === "confirmed" ? "active" : ""}`}
              onClick={() => setFilter("confirmed")}
            >
              <FaCheck /> ลงข้อมูลแล้ว ({stats.confirmed})
            </button>
            <button
              className={`filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => setFilter("all")}
            >
              <FaFilter /> ทั้งหมด ({stats.total})
            </button>
          </div>
        </div>

        {/* Request List */}
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <FaFileAlt className="empty-icon" />
            <h3>ไม่พบข้อมูล</h3>
            <p>ไม่มีใบลาที่ตรงกับเงื่อนไขที่เลือก</p>
          </div>
        ) : (
          <div className="requests-table-container">
            <table className="requests-table">
              <thead>
                <tr>
                  <th>ผู้ลา</th>
                  <th>ประเภท</th>
                  <th>วันที่ลา</th>
                  <th>จำนวน</th>
                  <th>สถานะ</th>
                  <th>การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <div className="user-cell">
                        <FaUser className="user-icon" />
                        <div>
                          <div className="user-name">
                            {request.user?.firstName} {request.user?.lastName}
                          </div>
                          <div className="user-dept">
                            {request.user?.department?.name || "-"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{getLeaveTypeName(request.leaveType)}</td>
                    <td>
                      <div className="date-cell">
                        <FaCalendarAlt className="date-icon" />
                        {formatDate(request.startDate)} -{" "}
                        {formatDate(request.endDate)}
                      </div>
                    </td>
                    <td className="days-cell">{request.totalDays} วัน</td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="preview-btn"
                          onClick={() => handlePreview(request)}
                          title="ดูตัวอย่างใบลา"
                        >
                          <FaEye />
                        </button>
                        {request.status === "pending" ? (
                          <button
                            className="confirm-btn"
                            onClick={() => handleConfirmClick(request)}
                            disabled={confirmingId === request.id}
                          >
                            <FaCheck />
                            {confirmingId === request.id
                              ? "กำลังยืนยัน..."
                              : "ยืนยัน"}
                          </button>
                        ) : (
                          <span className="confirmed-text">
                            ✓ ดำเนินการแล้ว
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Confirm Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                <FaTimes />
              </button>
              <h2>ยืนยันการลงข้อมูล</h2>
              {selectedRequest && (
                <div className="modal-info">
                  <p>
                    <strong>ผู้ลา:</strong> {selectedRequest.user?.firstName}{" "}
                    {selectedRequest.user?.lastName}
                  </p>
                  <p>
                    <strong>ประเภท:</strong>{" "}
                    {getLeaveTypeName(selectedRequest.leaveType)}
                  </p>
                  <p>
                    <strong>วันที่:</strong>{" "}
                    {formatDate(selectedRequest.startDate)} -{" "}
                    {formatDate(selectedRequest.endDate)} (
                    {selectedRequest.totalDays} วัน)
                  </p>
                </div>
              )}
              <div className="form-group">
                <label>หมายเหตุ (ไม่บังคับ)</label>
                <textarea
                  value={confirmNote}
                  onChange={(e) => setConfirmNote(e.target.value)}
                  placeholder="ระบุหมายเหตุเพิ่มเติม..."
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                >
                  ยกเลิก
                </button>
                <button
                  className="btn-confirm"
                  onClick={handleConfirm}
                  disabled={confirmingId}
                >
                  <FaCheck /> ยืนยันการลงข้อมูล
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LeaveManagement;
