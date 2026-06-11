import React, { useState, useEffect } from "react";
import Loading from "../components/common/Loading";
import {
  FaFileAlt,
  FaDownload,
  FaFilePdf,
  FaSearch,
  FaEye,
} from "react-icons/fa";
import config from "../config";
import "./LeaveForms.css";

const API_URL = config.API_URL;

const LeaveForms = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/forms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดรายการฟอร์มได้");
      }

      const data = await response.json();
      setForms(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (form) => {
    try {
      setDownloading(form.filename);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}${form.downloadUrl}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถดาวน์โหลดไฟล์ได้");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = form.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(null);
    }
  };

  const handlePreview = (form) => {
    // สร้าง preview URL (เปลี่ยนจาก /download/ เป็น /preview/)
    const previewUrl = form.downloadUrl.replace("/download/", "/preview/");
    window.open(`${API_URL}${previewUrl}`, "_blank");
  };

  const filteredForms = forms.filter(
    (form) =>
      form.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      form.filename.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Form type icons and colors mapping
  const getFormStyle = (filename) => {
    if (
      filename.includes("ลาป่วย") ||
      filename.includes("ลากิจ") ||
      filename.includes("คลอด")
    ) {
      return { color: "#e74c3c", label: "ลาป่วย/ลากิจ/คลอดบุตร" };
    }
    if (filename.includes("พักผ่อน")) {
      return { color: "#3498db", label: "ลาพักผ่อน" };
    }
    if (filename.includes("ต่างประเทศ")) {
      return { color: "#9b59b6", label: "ไปต่างประเทศ" };
    }
    if (filename.includes("ยกเลิก")) {
      return { color: "#f39c12", label: "ยกเลิกวันลา" };
    }
    if (filename.includes("ช่วยเหลือภริยา")) {
      return { color: "#1abc9c", label: "ช่วยเหลือภริยา" };
    }
    if (filename.includes("อุปสมบท")) {
      return { color: "#f39c12", label: "ลาอุปสมบท" };
    }
    return { color: "#34495e", label: "แบบฟอร์มทั่วไป" };
  };

  if (loading) {
    return (
      <>
        <div className="leave-forms-container">
          <Loading text="กำลังโหลดรายการแบบฟอร์ม..." />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="leave-forms-container">
        <div className="leave-forms-header">
          <div className="header-content">
            <FaFileAlt className="header-icon" />
            <div>
              <h1>แบบฟอร์มการลา</h1>
              <p>ดาวน์โหลดแบบฟอร์มสำหรับการขอลาแต่ละประเภท</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-wrapper">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="ค้นหาแบบฟอร์ม..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="forms-count">พบ {filteredForms.length} แบบฟอร์ม</div>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={fetchForms} className="retry-btn">
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {!error && filteredForms.length === 0 && (
          <div className="no-forms">
            <FaFilePdf className="no-forms-icon" />
            <p>ไม่พบแบบฟอร์มที่ค้นหา</p>
          </div>
        )}

        <div className="forms-grid">
          {filteredForms.map((form, index) => {
            const style = getFormStyle(form.filename);
            return (
              <div
                key={index}
                className="form-card"
                style={{ borderLeftColor: style.color }}
              >
                <div
                  className="form-card-icon"
                  style={{ backgroundColor: style.color }}
                >
                  <FaFilePdf />
                </div>
                <div className="form-card-content">
                  <h3>{form.displayName}</h3>
                  <p className="form-size">{form.sizeFormatted}</p>
                </div>
                <div className="form-card-buttons">
                  <button
                    className="preview-btn"
                    onClick={() => handlePreview(form)}
                    title="ดูตัวอย่าง"
                  >
                    <FaEye />
                    <span>ดูตัวอย่าง</span>
                  </button>
                  <button
                    className="download-btn"
                    onClick={() => handleDownload(form)}
                    disabled={downloading === form.filename}
                    title="ดาวน์โหลด"
                  >
                    {downloading === form.filename ? (
                      <span className="downloading">กำลังโหลด...</span>
                    ) : (
                      <>
                        <FaDownload />
                        <span>ดาวน์โหลด</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default LeaveForms;
