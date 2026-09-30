import React, { useState, useMemo, useRef, useEffect } from "react";
import { useMyLeaveRequests, useCancelLeaveRequest } from "../hooks/queries/useLeaveRequests";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/common/Toast";
import Loading from "../components/common/Loading";
import generateLeavePDF, { previewLeavePDF } from "../utils/generateLeavePDF";
import { getLeaveTypeName, getLeaveTypeIcon, getLeaveTypeCode } from "../utils/leaveTypeUtils";
import config from "../config";
import SEO, { SEOConfig } from "../components/common/SEO";
import "./LeaveHistory.css";

// React Icons
import {
  FaFileAlt,
  FaPaperclip,
  FaFilePdf,
  FaEye,
  FaTimesCircle,
  FaSpinner,
  FaTimes,
  FaCheckCircle,
  FaStamp,
  FaUserCheck,
  FaCalendarAlt,
} from "react-icons/fa";

const LeaveHistory = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { data: requests = [], isLoading: loading } = useMyLeaveRequests();
  const cancelMutation = useCancelLeaveRequest();
  const [downloadingId, setDownloadingId] = useState(null);
  const [cancelModal, setCancelModal] = useState({ isOpen: false, request: null, reason: "" });
  const [filterTab, setFilterTab] = useState("all"); // all, pending, approved, rejected_cancelled
  const [expandedReasonId, setExpandedReasonId] = useState(null);
  const [imgErrors, setImgErrors] = useState({});
  const modalRef = useRef(null);

  useEffect(() => {
    if (!cancelModal.isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setCancelModal({ isOpen: false, request: null, reason: "" });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => modalRef.current?.focus());
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [cancelModal.isOpen]);

  const handleImageError = (id) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  const getProfileImageUrl = (profileImage) => {
    if (!profileImage) return null;
    if (profileImage.startsWith("http://") || profileImage.startsWith("https://")) {
      return profileImage;
    }
    let normalizedPath = profileImage.replace(/\\/g, "/");
    if (!normalizedPath.startsWith("/")) {
      normalizedPath = "/" + normalizedPath;
    }
    return `${config.API_URL}${normalizedPath}`;
  };

  // Filtered requests based on active tab
  const filteredRequests = useMemo(() => {
    if (filterTab === "pending") {
      return requests.filter((r) =>
        ["pending", "pending_dean", "pending_vp"].includes(r.status)
      );
    }
    if (filterTab === "approved") {
      return requests.filter((r) =>
        ["approved", "confirmed"].includes(r.status)
      );
    }
    if (filterTab === "rejected_cancelled") {
      return requests.filter((r) =>
        ["rejected", "cancelled"].includes(r.status)
      );
    }
    return requests;
  }, [requests, filterTab]);

  // Tab counts
  const counts = useMemo(() => {
    const pending = requests.filter((r) =>
      ["pending", "pending_dean", "pending_vp"].includes(r.status)
    ).length;
    const approved = requests.filter((r) =>
      ["approved", "confirmed"].includes(r.status)
    ).length;
    const rejectedCancelled = requests.filter((r) =>
      ["rejected", "cancelled"].includes(r.status)
    ).length;
    return { all: requests.length, pending, approved, rejectedCancelled };
  }, [requests]);

  // ดาวน์โหลดใบลา PDF
  const handleDownloadPDF = async (request) => {
    setDownloadingId(request.id || request._id);
    try {
      const confirmedRequests = requests.filter(
        (r) => r.status === "confirmed" && r.id !== request.id
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

      confirmedRequests.forEach((r) => {
        const code = getLeaveTypeCode(r.leaveType);
        if (leaveStats[code]) {
          leaveStats[code].used += parseFloat(r.totalDays) || 0;
        }
      });

      const leaveData = {
        ...request,
        leaveType: getLeaveTypeCode(request.leaveType),
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        totalDays: request.totalDays,
        contactAddress: request.contactAddress || "",
        contactPhone: request.contactPhone || "",
        leaveStats: leaveStats,
        createdAt: request.createdAt,
      };
      await generateLeavePDF(leaveData, user);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("เกิดข้อผิดพลาดในการดาวน์โหลด PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  // ดูตัวอย่างใบลา PDF (เปิดแท็บใหม่)
  const handlePreviewPDF = async (request) => {
    const reqId = request.id || request._id;
    setDownloadingId(`preview_${reqId}`);
    try {
      const confirmedRequests = requests.filter(
        (r) => r.status === "confirmed" && r.id !== request.id
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

      confirmedRequests.forEach((r) => {
        const code = getLeaveTypeCode(r.leaveType);
        if (leaveStats[code]) {
          leaveStats[code].used += parseFloat(r.totalDays) || 0;
        }
      });

      const leaveData = {
        ...request,
        leaveType: getLeaveTypeCode(request.leaveType),
        startDate: request.startDate,
        endDate: request.endDate,
        reason: request.reason,
        totalDays: request.totalDays,
        contactAddress: request.contactAddress || "",
        contactPhone: request.contactPhone || "",
        leaveStats: leaveStats,
        createdAt: request.createdAt,
      };
      await previewLeavePDF(leaveData, user);
    } catch (error) {
      console.error("Error previewing PDF:", error);
      toast.error("เกิดข้อผิดพลาดในการเปิดดู PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCancelClick = (request) => {
    setCancelModal({ isOpen: true, request, reason: "" });
  };

  const submitCancel = async () => {
    const { request, reason } = cancelModal;
    if (!request) return;

    try {
      await cancelMutation.mutateAsync({ id: request.id || request._id, reason });
      toast.success("ยกเลิกใบลาเรียบร้อยแล้ว");
      window.dispatchEvent(new Event("refreshNotifications"));
      setCancelModal({ isOpen: false, request: null, reason: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการยกเลิก");
    }
  };

  // เปิดไฟล์แนบในหน้าต่างใหม่
  const handlePreview = (fileUrl) => {
    if (!fileUrl) return;

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      window.open(fileUrl, "_blank");
      return;
    }

    let normalizedPath = fileUrl.replace(/\\/g, "/");
    if (!normalizedPath.startsWith("/")) {
      normalizedPath = "/" + normalizedPath;
    }
    window.open(`${config.API_URL}${normalizedPath}`, "_blank");
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStepBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="approval-step-badge step-pending">
            <FaStamp /> ขั้นที่ ๑: รอหัวหน้างานพิจารณา
          </span>
        );
      case "pending_dean":
        return (
          <span className="approval-step-badge step-pending-dean">
            <FaStamp /> ขั้นที่ ๒: รอคณบดี/ผอ.สำนักพิจารณา
          </span>
        );
      case "pending_vp":
        return (
          <span className="approval-step-badge step-pending-vp">
            <FaUserCheck /> ขั้นที่ ๓: รอคำสั่งรองอธิการบดีฝ่ายบุคคลฯ
          </span>
        );
      case "approved":
        return (
          <span className="approval-step-badge step-approved">
            <FaCheckCircle /> อนุมัติแล้ว (รอลงข้อมูล)
          </span>
        );
      case "confirmed":
        return (
          <span className="approval-step-badge step-confirmed">
            <FaCheckCircle /> ✓ ลงข้อมูลบันทึกเรียบร้อย
          </span>
        );
      case "rejected":
        return (
          <span className="approval-step-badge step-rejected">
            <FaTimesCircle /> ไม่อนุมัติ
          </span>
        );
      case "cancelled":
        return (
          <span className="approval-step-badge step-cancelled">
            <FaTimesCircle /> ยกเลิกแล้ว
          </span>
        );
      default:
        return <span className="approval-step-badge step-default">{status}</span>;
    }
  };

  if (loading) {
    return (
      <>
        <SEO {...SEOConfig.leaveHistory} />
        <Loading size="fullpage" text="กำลังโหลด..." />
      </>
    );
  }

  const profileImageUrl = getProfileImageUrl(user?.profileImage);

  return (
    <>
      <SEO {...SEOConfig.leaveHistory} />
      <div className="leave-history-page">
        {/* Page Header matching Approvals */}
        <div className="history-page-header">
          <div className="header-info">
            <h1>ประวัติการลา</h1>
            <p>รายการบันทึกการลาทั้งหมดของคุณ ({filteredRequests.length} รายการ)</p>
          </div>

          {/* Status Filter Tabs */}
          <div className="history-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${filterTab === "all" ? "active" : ""}`}
              onClick={() => setFilterTab("all")}
            >
              ทั้งหมด <span className="tab-badge">{counts.all}</span>
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${filterTab === "pending" ? "active" : ""}`}
              onClick={() => setFilterTab("pending")}
            >
              รอพิจารณา <span className="tab-badge">{counts.pending}</span>
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${filterTab === "approved" ? "active" : ""}`}
              onClick={() => setFilterTab("approved")}
            >
              อนุมัติแล้ว <span className="tab-badge">{counts.approved}</span>
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${filterTab === "rejected_cancelled" ? "active" : ""}`}
              onClick={() => setFilterTab("rejected_cancelled")}
            >
              ไม่อนุมัติ / ยกเลิก <span className="tab-badge">{counts.rejectedCancelled}</span>
            </button>
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <h3>ไม่มีข้อมูลการลาในหมวดหมู่นี้</h3>
            <p>
              {filterTab === "all"
                ? "คุณยังไม่มีประวัติการลาในระบบ"
                : "ไม่พบรายการลาที่ตรงกับเงื่อนไขตัวกรอง"}
            </p>
          </div>
        ) : (
          <div className="history-grid">
            {filteredRequests.map((request) => {
              const reqId = request.id || request._id;
              const showImage = profileImageUrl && !imgErrors[reqId];
              const reasonIsLong = (request.reason || "").length > 90;
              const reasonExpanded = expandedReasonId === reqId;
              const isCancellable = ["pending", "pending_dean", "pending_vp"].includes(
                request.status
              );

              return (
                <div key={reqId} className="history-card">
                  {/* Card Header matching Approvals */}
                  <div className="card-header">
                    <div className="employee-info">
                      <div className="avatar">
                        {showImage ? (
                          <img
                            src={profileImageUrl}
                            alt={user?.firstName || "Profile"}
                            onError={() => handleImageError(reqId)}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: "50%",
                            }}
                          />
                        ) : (
                          user?.firstName?.charAt(0) || "U"
                        )}
                      </div>
                      <div className="employee-details">
                        <h4>
                          {user?.firstName || "-"} {user?.lastName || ""}
                        </h4>
                        <p>
                          {user?.department?.name || "-"} • {user?.position || "บุคลากร"}
                        </p>
                        {getStepBadge(request.status)}
                      </div>
                    </div>
                    <div className="leave-type-badge">
                      {getLeaveTypeIcon(request.leaveType)}{" "}
                      {getLeaveTypeName(request.leaveType)}
                    </div>
                  </div>

                  {/* Card Body matching Approvals */}
                  <div className="card-body">
                    {/* Date Range Display */}
                    <div className="date-range-display">
                      <div className="date-item">
                        <span className="date-label">เริ่มต้น</span>
                        <span className="date-value">
                          {formatDate(request.startDate)}
                        </span>
                      </div>
                      <div className="date-arrow">→</div>
                      <div className="date-item">
                        <span className="date-label">สิ้นสุด</span>
                        <span className="date-value">
                          {formatDate(request.endDate)}
                        </span>
                      </div>
                      <div className="days-count">
                        <span className="days-number">{request.totalDays}</span>
                        <span className="days-label">วัน</span>
                        {(request.timeSlot === "morning" ||
                          request.timeSlot === "afternoon") && (
                          <span className="time-slot-badge">
                            ({request.timeSlot === "morning" ? "เช้า" : "บ่าย"})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reason Section */}
                    <div className="reason-section">
                      <span className="reason-label">เหตุผลการขอลา:</span>
                      <p className={`reason-text ${reasonExpanded ? "is-expanded" : ""}`}>
                        {request.reason || "-"}
                      </p>
                      {reasonIsLong && (
                        <button
                          type="button"
                          className="reason-toggle"
                          onClick={() => setExpandedReasonId(reasonExpanded ? null : reqId)}
                          aria-expanded={reasonExpanded}
                        >
                          {reasonExpanded ? "ย่อรายละเอียด" : "ดูรายละเอียด"}
                        </button>
                      )}
                    </div>

                    {/* ความเห็นของหัวหน้างาน (ถ้ามี) */}
                    {request.headComment && (
                      <div className="approver-comment-box head-comment-box">
                        <div className="approver-comment-title">
                          <FaStamp /> ๑. ความเห็นหัวหน้างาน
                          {request.headApprover && (
                            <span> ({request.headApprover.title || ""}{request.headApprover.firstName} {request.headApprover.lastName})</span>
                          )}
                        </div>
                        <div className="approver-comment-text">{request.headComment}</div>
                      </div>
                    )}

                    {/* ความเห็นของคณบดี/ผอ.สำนัก (ถ้ามี) */}
                    {request.deanComment && (
                      <div className="approver-comment-box dean-comment-box">
                        <div className="approver-comment-title">
                          <FaStamp /> ๒. ความเห็นคณบดี/ผอ.สำนัก
                          {request.deanApprover && (
                            <span> ({request.deanApprover.title || ""}{request.deanApprover.firstName} {request.deanApprover.lastName})</span>
                          )}
                        </div>
                        <div className="approver-comment-text">{request.deanComment}</div>
                      </div>
                    )}

                    {/* คำสั่ง/ความเห็นของรองอธิการบดี (ถ้ามี) */}
                    {(request.vpComment || request.vpDecision) && (
                      <div className="approver-comment-box vp-comment-box">
                        <div className="approver-comment-title">
                          <FaUserCheck /> ๓. คำสั่งรองอธิการบดี
                          {request.vpApprover && (
                            <span> ({request.vpApprover.title || ""}{request.vpApprover.firstName} {request.vpApprover.lastName})</span>
                          )}
                        </div>
                        <div className="approver-comment-text">
                          {request.vpDecision === "allow"
                            ? "อนุญาต"
                            : request.vpDecision === "disallow"
                              ? "ไม่อนุญาต"
                              : ""}
                          {request.vpComment ? ` : ${request.vpComment}` : ""}
                        </div>
                      </div>
                    )}

                    {/* เหตุผลการไม่อนุมัติ (ถ้ามี) */}
                    {request.status === "rejected" && request.rejectionReason && (
                      <div className="approver-comment-box rejection-box">
                        <div className="approver-comment-title">
                          <FaTimesCircle /> เหตุผลการไม่อนุมัติ
                        </div>
                        <div className="approver-comment-text">{request.rejectionReason}</div>
                      </div>
                    )}

                    {/* ไฟล์แนบ (ถ้ามี) */}
                    {request.attachments && request.attachments.length > 0 && (
                      <div className="attachments-section">
                        <span className="attachments-label">
                          <FaPaperclip /> ไฟล์แนบ {request.attachments.length} ไฟล์
                        </span>
                        <div className="attachments-list">
                          {request.attachments.map((file, idx) => {
                            const filePath =
                              typeof file === "string" ? file : file.filePath;
                            const fileName =
                              typeof file === "string"
                                ? file.split("/").pop()
                                : file.fileName ||
                                  filePath?.split("/").pop() ||
                                  `ไฟล์แนบ ${idx + 1}`;

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handlePreview(filePath)}
                                className="attachment-link"
                              >
                                <FaFileAlt /> {fileName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Actions / Footer matching Approvals */}
                  <div className="card-actions">
                    <div className="footer-created-date">
                      <FaCalendarAlt className="created-icon" />
                      <span>ยื่นเมื่อ {formatDate(request.createdAt)}</span>
                    </div>

                    <div className="footer-buttons-group">
                      {isCancellable && (
                        <button
                          type="button"
                          className="cancel-action-btn"
                          onClick={() => handleCancelClick(request)}
                          title="ยกเลิกใบลา"
                        >
                          <FaTimesCircle /> ยกเลิก
                        </button>
                      )}
                      <button
                        type="button"
                        className="preview-pdf-btn"
                        onClick={() => handlePreviewPDF(request)}
                        title="ดูตัวอย่างใบลาในแท็บใหม่"
                        disabled={downloadingId === `preview_${reqId}`}
                      >
                        {downloadingId === `preview_${reqId}` ? (
                          <><FaSpinner className="spin" /> กำลังโหลด...</>
                        ) : (
                          <><FaEye /> ดูใบลา</>
                        )}
                      </button>
                      <button
                        type="button"
                        className="download-pdf-btn"
                        onClick={() => handleDownloadPDF(request)}
                        title="ดาวน์โหลดใบลา PDF"
                        disabled={downloadingId === reqId}
                      >
                        {downloadingId === reqId ? (
                          <><FaSpinner className="spin" /> กำลังโหลด...</>
                        ) : (
                          <><FaFilePdf /> ดาวน์โหลด</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancel Modal with Approvals-style dialog */}
        {cancelModal.isOpen && (
          <div
            className="modal-overlay"
            onClick={() => setCancelModal({ isOpen: false, request: null, reason: "" })}
          >
            <div
              className="history-modal-content"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="cancel-dialog-title"
              tabIndex="-1"
              ref={modalRef}
            >
              <h3 id="cancel-dialog-title">ยกเลิกใบลา</h3>
              <p className="modal-description">
                คุณต้องการยกเลิกใบลาวันที่{" "}
                <strong>
                  {formatDate(cancelModal.request?.startDate)} -{" "}
                  {formatDate(cancelModal.request?.endDate)}
                </strong>{" "}
                ใช่หรือไม่?
              </p>

              <div className="form-group">
                <label htmlFor="cancel-reason">
                  เหตุผลในการยกเลิก (ถ้ามี):
                </label>
                <textarea
                  id="cancel-reason"
                  rows="3"
                  placeholder="ระบุเหตุผลในการยกเลิก (เว้นว่างได้)"
                  value={cancelModal.reason}
                  onChange={(e) =>
                    setCancelModal({ ...cancelModal, reason: e.target.value })
                  }
                />
              </div>

              <div className="history-modal-actions">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() =>
                    setCancelModal({ isOpen: false, request: null, reason: "" })
                  }
                  disabled={cancelMutation.isLoading}
                >
                  <FaTimes /> ปิด
                </button>
                <button
                  type="button"
                  className="modal-confirm-btn"
                  onClick={submitCancel}
                  disabled={cancelMutation.isLoading}
                >
                  {cancelMutation.isLoading ? (
                    <>
                      <FaSpinner className="spin" /> กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> ยืนยันการยกเลิก
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LeaveHistory;
