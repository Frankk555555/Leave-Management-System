import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { leaveRequestsAPI } from "../services/api";
import SEO, { SEOConfig } from "../components/common/SEO";
import Loading from "../components/common/Loading";
import { getLeaveTypeName, getLeaveTypeIcon } from "../utils/leaveTypeUtils";
import "./Dashboard.css";
import React from "react";

// React Icons
import {
  FaChartBar,
  FaBullseye,
  FaHospital,
  FaClipboardList,
  FaUmbrellaBeach,
  FaHandPaper,
  FaBaby,
  FaUserFriends,
  FaChild,
  FaPray,
  FaMedal,
} from "react-icons/fa";

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [totalRequests, setTotalRequests] = useState(0);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { authAPI } = await import("../services/api");
      const [response, authRes] = await Promise.all([
        leaveRequestsAPI.getMyRequests(),
        authAPI.getMe()
      ]);
      const requests = response.data;
      setTotalRequests(requests.length);
      setRecentRequests(requests.slice(0, 5));
      
      if (updateUser && authRes.data) {
        updateUser(authRes.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // getLeaveTypeName, getLeaveTypeIcon imported from utils/leaveTypeUtils

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <>
        <SEO {...SEOConfig.dashboard} />
        <Loading size="fullpage" />
      </>
    );
  }

  const getRemainingBalance = (code) => {
    if (!user?.leaveBalances || !Array.isArray(user.leaveBalances)) return 0;
    const balance = user.leaveBalances.find(b => b.leaveType?.code === code);
    if (!balance) return 0;
    return parseFloat(balance.totalDays || 0) + parseFloat(balance.carriedOverDays || 0) - parseFloat(balance.usedDays || 0);
  };

  return (
    <>
      <SEO {...SEOConfig.dashboard} />
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>
            สวัสดี, คุณ {user?.firstName} {user?.lastName}{" "}
            <FaHandPaper style={{ marginLeft: "0.3rem", color: "#e6c314ff" }} />
          </h1>
          <p>ยินดีต้อนรับเข้าสู่ระบบบริหารการลา</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div
              className="stat-icon"
              style={{
                background: "linear-gradient(135deg, #667eea, #764ba2)",
              }}
            >
              <FaChartBar color="white" />
            </div>
            <div className="stat-info">
              <h3>{totalRequests}</h3>
              <p>บันทึกการลาทั้งหมด</p>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="leave-balance-card">
            <h2>
              <FaBullseye style={{ marginRight: "0.5rem" }} /> ยอดวันลาคงเหลือ
            </h2>
            <div className="balance-grid">
              <div className="balance-item">
                <div
                  className="balance-icon"
                  style={{
                    background: "linear-gradient(135deg, #059669, #10b981)",
                  }}
                >
                  <FaHospital color="white" />
                </div>
                <div className="balance-info">
                  <h4>ลาป่วย</h4>
                  <p>
                    <span className="balance-number">
                      {getRemainingBalance("sick")}
                    </span>{" "}
                    วัน
                  </p>
                </div>
                <div className="balance-bar">
                  <div
                    className="balance-progress"
                    style={{
                      width: `${Math.min(
                        (getRemainingBalance("sick") / 60) * 100,
                        100
                      )}%`,
                      background: "linear-gradient(90deg, #059669, #10b981)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="balance-item">
                <div
                  className="balance-icon"
                  style={{
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  }}
                >
                  <FaClipboardList color="white" />
                </div>
                <div className="balance-info">
                  <h4>ลากิจส่วนตัว</h4>
                  <p>
                    <span className="balance-number">
                      {getRemainingBalance("personal")}
                    </span>{" "}
                    วัน
                  </p>
                </div>
                <div className="balance-bar">
                  <div
                    className="balance-progress"
                    style={{
                      width: `${Math.min(
                        (getRemainingBalance("personal") / 45) * 100,
                        100
                      )}%`,
                      background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="balance-item">
                <div
                  className="balance-icon"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                  }}
                >
                  <FaUmbrellaBeach color="white" />
                </div>
                <div className="balance-info">
                  <h4>ลาพักผ่อน</h4>
                  <p>
                    <span className="balance-number">
                      {getRemainingBalance("vacation")}
                    </span>{" "}
                    วัน
                  </p>
                </div>
                <div className="balance-bar">
                  <div
                    className="balance-progress"
                    style={{
                      width: `${Math.min(
                        (getRemainingBalance("vacation") / 10) * 100,
                        100
                      )}%`,
                      background: "linear-gradient(90deg, #f59e0b, #fbbf24)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="balance-item">
                <div
                  className="balance-icon"
                  style={{
                    background: "linear-gradient(135deg, #ec4899, #f472b6)",
                  }}
                >
                  <FaBaby color="white" />
                </div>
                <div className="balance-info">
                  <h4>ลาคลอดบุตร</h4>
                  <p>
                    <span className="balance-number">
                      {getRemainingBalance("maternity")}
                    </span>{" "}
                    วัน
                  </p>
                </div>
                <div className="balance-bar">
                  <div
                    className="balance-progress"
                    style={{
                      width: `${Math.min(
                        (getRemainingBalance("maternity") / 90) * 100,
                        100
                      )}%`,
                      background: "linear-gradient(90deg, #ec4899, #f472b6)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="balance-item">
                <div
                  className="balance-icon"
                  style={{
                    background: "linear-gradient(135deg, #0891b2, #22d3ee)",
                  }}
                >
                  <FaUserFriends color="white" />
                </div>
                <div className="balance-info">
                  <h4>ลาช่วยภรรยาคลอด</h4>
                  <p>
                    <span className="balance-number">
                      {getRemainingBalance("paternity")}
                    </span>{" "}
                    วัน
                  </p>
                </div>
                <div className="balance-bar">
                  <div
                    className="balance-progress"
                    style={{
                      width: `${Math.min(
                        (getRemainingBalance("paternity") / 15) * 100,
                        100
                      )}%`,
                      background: "linear-gradient(90deg, #0891b2, #22d3ee)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="balance-item">
                <div
                  className="balance-icon"
                  style={{
                    background: "linear-gradient(135deg, #14b8a6, #5eead4)",
                  }}
                >
                  <FaChild color="white" />
                </div>
                <div className="balance-info">
                  <h4>ลาเลี้ยงดูบุตร</h4>
                  <p>
                    <span className="balance-number">
                      {getRemainingBalance("childcare")}
                    </span>{" "}
                    วัน
                  </p>
                </div>
                <div className="balance-bar">
                  <div
                    className="balance-progress"
                    style={{
                      width: `${Math.min(
                        (getRemainingBalance("childcare") / 150) * 100,
                        100
                      )}%`,
                      background: "linear-gradient(90deg, #14b8a6, #5eead4)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="balance-item">
                <div
                  className="balance-icon"
                  style={{
                    background: "linear-gradient(135deg, #ea580c, #fb923c)",
                  }}
                >
                  <FaPray color="white" />
                </div>
                <div className="balance-info">
                  <h4>ลาอุปสมบท/ฮัจย์</h4>
                  <p>
                    <span className="balance-number">
                      {getRemainingBalance("ordination")}
                    </span>{" "}
                    วัน
                  </p>
                </div>
                <div className="balance-bar">
                  <div
                    className="balance-progress"
                    style={{
                      width: `${Math.min(
                        (getRemainingBalance("ordination") / 120) * 100,
                        100
                      )}%`,
                      background: "linear-gradient(90deg, #ea580c, #fb923c)",
                    }}
                  ></div>
                </div>
              </div>

              <div className="balance-item">
                <div
                  className="balance-icon"
                  style={{
                    background: "linear-gradient(135deg, #3b82f6, #60a5fa)",
                  }}
                >
                  <FaMedal color="white" />
                </div>
                <div className="balance-info">
                  <h4>ลาตรวจเลือก</h4>
                  <p>
                    <span className="balance-number">
                      {getRemainingBalance("military")}
                    </span>{" "}
                    วัน
                  </p>
                </div>
                <div className="balance-bar">
                  <div
                    className="balance-progress"
                    style={{
                      width: "100%",
                      background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="recent-requests-card">
            <h2>
              <FaClipboardList style={{ marginRight: "0.5rem" }} /> บันทึกล่าสุด
            </h2>
            {recentRequests.length === 0 ? (
              <p className="no-data">ยังไม่มีบันทึกการลา</p>
            ) : (
              <div className="requests-list">
                {recentRequests.map((request) => (
                  <div key={request.id || request._id} className="request-item">
                    <div className="request-type">
                      {getLeaveTypeIcon(request.leaveType)}
                    </div>
                    <div className="request-info">
                      <h4>{getLeaveTypeName(request.leaveType)}</h4>
                      <p>
                        {formatDate(request.startDate)} -{" "}
                        {formatDate(request.endDate)}
                      </p>
                    </div>
                    <div className="request-days">{request.totalDays} วัน</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
