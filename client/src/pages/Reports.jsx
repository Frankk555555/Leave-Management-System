import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { reportsAPI, facultiesAPI, departmentsAPI, usersAPI } from "../services/api";
import { useToast } from "../components/common/Toast";
import Loading from "../components/common/Loading";
import {
  FaChartBar,
  FaFileExcel,
  FaFilePdf,
  FaSyncAlt,
  FaFileAlt,
  FaCalendarAlt,
  FaUsers,
  FaCheckCircle,
  FaChartLine,
  FaHospital,
  FaClipboardList,
  FaBuilding,
  FaFilter,
  FaInfoCircle,
  FaSpinner
} from "react-icons/fa";
import "./Reports.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports = () => {
  const toast = useToast();
  const [statistics, setStatistics] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState("");
  const [exportingType, setExportingType] = useState(null);
  const [resetting, setResetting] = useState(false);

  // New states for filters
  const [usersList, setUsersList] = useState([]);
  const [facultiesList, setFacultiesList] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Time & Date range filter states
  const [filterType, setFilterType] = useState("year"); // "year", "month", "custom", "datetime"
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [timeSlot, setTimeSlot] = useState("all");

  const thaiMonthsList = [
    { value: 1, label: "มกราคม" },
    { value: 2, label: "กุมภาพันธ์" },
    { value: 3, label: "มีนาคม" },
    { value: 4, label: "เมษายน" },
    { value: 5, label: "พฤษภาคม" },
    { value: 6, label: "มิถุนายน" },
    { value: 7, label: "กรกฎาคม" },
    { value: 8, label: "สิงหาคม" },
    { value: 9, label: "กันยายน" },
    { value: 10, label: "ตุลาคม" },
    { value: 11, label: "พฤศจิกายน" },
    { value: 12, label: "ธันวาคม" },
  ];

  useEffect(() => {
    const init = async () => {
      await fetchFilterData();
      await fetchStatistics(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!initialLoading) {
      fetchStatistics(false);
    }
  }, [
    year,
    month,
    filterType,
    startDate,
    endDate,
    startTime,
    endTime,
    timeSlot,
    selectedUserId,
    selectedFacultyId,
    selectedDepartmentId,
  ]);

  const fetchFilterData = async () => {
    try {
      const [usersRes, facultiesRes, deptsRes] = await Promise.all([
        usersAPI.getAll(),
        facultiesAPI.getAll(),
        departmentsAPI.getAll(),
      ]);
      const sortedUsers = usersRes.data.sort((a, b) =>
        a.firstName.localeCompare(b.firstName, "th")
      );
      setUsersList(sortedUsers);
      setFacultiesList(facultiesRes.data);
      setDepartmentsList(deptsRes.data);
    } catch (error) {
      console.error("Error fetching filter data:", error);
    }
  };

  const getFilterParams = () => {
    const params = {
      userId: selectedUserId || undefined,
      facultyId: selectedFacultyId || undefined,
      departmentId: selectedDepartmentId || undefined,
    };

    if (filterType === "year") {
      params.year = year;
    } else if (filterType === "month") {
      params.year = year;
      params.month = month || undefined;
    } else if (filterType === "custom") {
      params.startDate = startDate;
      params.endDate = endDate;
    } else if (filterType === "datetime") {
      params.startDate = startDate;
      params.endDate = endDate;
      params.startTime = startTime || undefined;
      params.endTime = endTime || undefined;
      params.timeSlot = timeSlot !== "all" ? timeSlot : undefined;
    }

    return params;
  };

  const fetchStatistics = async (isInitial = false) => {
    try {
      if (isInitial) {
        setInitialLoading(true);
      } else {
        setStatsLoading(true);
      }

      if (
        (filterType === "custom" || filterType === "datetime") &&
        (!startDate || !endDate)
      ) {
        setStatsLoading(false);
        if (isInitial) setInitialLoading(false);
        return;
      }

      const params = getFilterParams();
      const response = await reportsAPI.getStatistics(params);
      setStatistics(response.data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    } finally {
      if (isInitial) setInitialLoading(false);
      setStatsLoading(false);
    }
  };

  const handleFacultyChange = (e) => {
    const val = e.target.value;
    setSelectedFacultyId(val);
    setSelectedDepartmentId(""); // Reset department on faculty change
  };

  const handleExportExcel = async () => {
    if ((filterType === "custom" || filterType === "datetime") && (!startDate || !endDate)) {
      toast.error("กรุณาเลือกช่วงวันที่ให้ครบถ้วนก่อนส่งออกรายงาน");
      return;
    }

    setExportingType("excel");
    try {
      const params = getFilterParams();
      const response = await reportsAPI.exportExcel(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      let filename = `leave-report-${year}.xlsx`;
      if (filterType === "month") {
        filename = `leave-report-${year}-month-${month || "all"}.xlsx`;
      } else if (filterType === "custom" || filterType === "datetime") {
        filename = `leave-report-${startDate}_to_${endDate}.xlsx`;
      }
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("ส่งออกไฟล์ Excel เรียบร้อยแล้ว");
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการส่งออกไฟล์");
    } finally {
      setExportingType(null);
    }
  };

  const handleExportPDF = async () => {
    if ((filterType === "custom" || filterType === "datetime") && (!startDate || !endDate)) {
      toast.error("กรุณาเลือกช่วงวันที่ให้ครบถ้วนก่อนส่งออกรายงาน");
      return;
    }

    setExportingType("pdf");
    try {
      const params = getFilterParams();
      const response = await reportsAPI.exportPDF(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      let filename = `leave-report-${year}.pdf`;
      if (filterType === "month") {
        filename = `leave-report-${year}-month-${month || "all"}.pdf`;
      } else if (filterType === "custom" || filterType === "datetime") {
        filename = `leave-report-${startDate}_to_${endDate}.pdf`;
      }
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("ส่งออกไฟล์ PDF เรียบร้อยแล้ว");
    } catch (error) {
      console.error(error);
      toast.error("เกิดข้อผิดพลาดในการส่งออกไฟล์");
    } finally {
      setExportingType(null);
    }
  };

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

  const monthNames = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  const monthlyChartData = {
    labels: monthNames,
    datasets: [
      {
        label: "จำนวนวันลา",
        data: statistics?.byMonth || [],
        backgroundColor: "rgba(102, 126, 234, 0.7)",
        borderColor: "rgba(102, 126, 234, 1)",
        borderWidth: 1,
        borderRadius: 8,
      },
    ],
  };

  const typeChartData = {
    labels: ["ลาป่วย", "ลากิจ", "ลาพักร้อน"],
    datasets: [
      {
        data: [
          statistics?.byType?.sick || 0,
          statistics?.byType?.personal || 0,
          statistics?.byType?.vacation || 0,
        ],
        backgroundColor: [
          "rgba(17, 153, 142, 0.8)",
          "rgba(102, 126, 234, 0.8)",
          "rgba(246, 211, 101, 0.8)",
        ],
        borderWidth: 0,
      },
    ],
  };

  const statusChartData = {
    labels: ["อนุมัติแล้ว", "รออนุมัติ", "ไม่อนุมัติ"],
    datasets: [
      {
        data: [
          statistics?.byStatus?.approved || 0,
          statistics?.byStatus?.pending || 0,
          statistics?.byStatus?.rejected || 0,
        ],
        backgroundColor: [
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderWidth: 0,
      },
    ],
  };

  if (initialLoading) {
    return (
      <>
        <Loading size="fullpage" text="กำลังโหลด..." />
      </>
    );
  }

  // Autocomplete filtering
  const filteredUsers = usersList.filter(user => {
    const query = userSearchQuery.toLowerCase();
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const employeeId = (user.employeeId || "").toLowerCase();
    return fullName.includes(query) || employeeId.includes(query);
  });

  const selectedUser = usersList.find(u => String(u.id) === String(selectedUserId));
  const selectedUserName = selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "";

  // Cascade department filtering
  const filteredDepartments = selectedFacultyId
    ? departmentsList.filter(dept => String(dept.facultyId) === String(selectedFacultyId))
    : departmentsList;

  return (
    <>
      <div className="reports-page">
        <div className="page-header">
          <div>
            <h1>รายงานและสถิติ</h1>
            <p>
              ภาพรวมการลาของบุคลากรในองค์กร
              {statsLoading && (
                <span style={{ marginLeft: "8px", color: "#667eea", fontSize: "0.85rem" }}>
                  <FaSpinner className="spin" style={{ marginRight: "4px" }} />
                  กำลังอัปเดต...
                </span>
              )}
            </p>
          </div>
          <div className="header-actions">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="year-select"
            >
              <option value="year">ตามปีงบประมาณ</option>
              <option value="month">ตามรายเดือน</option>
              <option value="custom">กำหนดช่วงวันที่เอง</option>
              <option value="datetime">กำหนดช่วงวันและเวลา</option>
            </select>

            {(filterType === "year" || filterType === "month") && (
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="year-select"
              >
                {[...Array(5)].map((_, i) => {
                  const y = new Date().getFullYear() - i;
                  return (
                    <option key={y} value={y}>
                      ปี {y + 543}
                    </option>
                  );
                })}
              </select>
            )}

            {filterType === "month" && (
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : "")}
                className="year-select"
              >
                <option value="">-- ทุกเดือน --</option>
                {thaiMonthsList.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            )}

            <button
              className="export-btn excel"
              onClick={handleExportExcel}
              disabled={!!exportingType}
            >
              {exportingType === "excel" ? (
                <><FaSpinner className="spin" style={{ marginRight: "4px" }} /> กำลังส่งออก...</>
              ) : (
                <><FaFileExcel style={{ marginRight: "4px" }} /> Excel</>
              )}
            </button>
            <button
              className="export-btn pdf"
              onClick={handleExportPDF}
              disabled={!!exportingType}
            >
              {exportingType === "pdf" ? (
                <><FaSpinner className="spin" style={{ marginRight: "4px" }} /> กำลังส่งออก...</>
              ) : (
                <><FaFilePdf style={{ marginRight: "4px" }} /> PDF</>
              )}
            </button>
          </div>
        </div>

        <div className="filters-card">
          <h3>
            <FaFilter /> ค้นหาข้อมูลสำหรับส่งออกรายงาน
          </h3>

          {filterType === "custom" && (
            <div className="date-range-filter-row">
              <div className="filter-group">
                <label>วันที่เริ่มต้น</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="filter-date-input"
                />
              </div>
              <div className="filter-group">
                <label>วันที่สิ้นสุด</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="filter-date-input"
                />
              </div>
            </div>
          )}

          {filterType === "datetime" && (
            <div className="datetime-filter-row">
              <div className="filter-group">
                <label>วันที่เริ่มต้น</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="filter-date-input"
                />
              </div>
              <div className="filter-group">
                <label>เวลาเริ่มต้น</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="filter-date-input"
                />
              </div>
              <div className="filter-group">
                <label>วันที่สิ้นสุด</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="filter-date-input"
                />
              </div>
              <div className="filter-group">
                <label>เวลาสิ้นสุด</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="filter-date-input"
                />
              </div>
              <div className="filter-group">
                <label>ช่วงเวลาการลา</label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">ทุกช่วงเวลา</option>
                  <option value="full">เต็มวัน (Full Day)</option>
                  <option value="morning">ครึ่งวันเช้า (Morning)</option>
                  <option value="afternoon">ครึ่งวันบ่าย (Afternoon)</option>
                </select>
              </div>
            </div>
          )}

          <div className="filters-grid">
            <div className="filter-group">
              <label>บุคลากร</label>
              <div className="searchable-select">
                <div 
                  className="searchable-select-trigger" 
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <span>{selectedUserName || "-- ค้นหารายชื่อ --"}</span>
                  {selectedUserId && (
                    <span 
                      className="clear-select-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserId("");
                        setUserSearchQuery("");
                      }}
                    >
                      ✕
                    </span>
                  )}
                  <span className="arrow">▼</span>
                </div>
                
                {userDropdownOpen && (
                  <>
                    <div className="select-overlay" onClick={() => setUserDropdownOpen(false)} />
                    <div className="searchable-select-dropdown">
                      <input
                        type="text"
                        className="search-input"
                        placeholder="พิมพ์เพื่อค้นหาด้วยชื่อหรือรหัสพนักงาน..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                      <div className="options-list">
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className={`option-item ${selectedUserId === user.id ? "selected" : ""}`}
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setUserDropdownOpen(false);
                              setUserSearchQuery("");
                            }}
                          >
                            <div className="option-name">{user.firstName} {user.lastName}</div>
                            <div className="option-sub">
                              รหัส: {user.employeeId} {user.position ? `| ${user.position}` : ""} {user.department?.name ? `(${user.department.name})` : ""}
                            </div>
                          </div>
                        ))}
                        {filteredUsers.length === 0 && (
                          <div className="no-options">ไม่พบข้อมูลผู้ใช้งาน</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="filter-group">
              <label>คณะ</label>
              <select
                value={selectedFacultyId}
                onChange={handleFacultyChange}
                className="filter-select"
              >
                <option value="">-- เลือกคณะทั้งหมด --</option>
                {facultiesList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>แผนก / สาขาวิชา</label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => setSelectedDepartmentId(e.target.value)}
                className="filter-select"
              >
                <option value="">-- เลือกสาขาทั้งหมด --</option>
                {filteredDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="filter-note">
            <FaInfoCircle color="#667eea" style={{ marginRight: "4px", flexShrink: 0 }} />
            <span>สามารถเลือกตัวกรองเพื่อจำกัดข้อมูลรายงานได้ หากไม่เลือกจะถือเป็นการดึงข้อมูลภาพรวมของทุกแผนกและบุคลากรทุกคน</span>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">
              <FaFileAlt color="white" size={24} />
            </span>
            <div className="stat-info">
              <h3>{statistics?.totalRequests || 0}</h3>
              <p>คำขอลาทั้งหมด</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <FaCalendarAlt color="white" size={24} />
            </span>
            <div className="stat-info">
              <h3>{statistics?.totalDays || 0}</h3>
              <p>วันลาทั้งหมด</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <FaUsers color="white" size={24} />
            </span>
            <div className="stat-info">
              <h3>{statistics?.totalEmployees || 0}</h3>
              <p>บุคลากรในระบบ</p>
            </div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">
              <FaCheckCircle color="white" size={24} />
            </span>
            <div className="stat-info">
              <h3>{statistics?.byStatus?.approved || 0}</h3>
              <p>อนุมัติแล้ว</p>
            </div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>
              <FaChartLine style={{ marginRight: "8px" }} /> สถิติการลารายเดือน
            </h3>
            <div className="chart-container">
              <Bar
                data={monthlyChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    y: { beginAtZero: true },
                  },
                }}
              />
            </div>
          </div>

          <div className="chart-card small">
            <h3>
              <FaHospital style={{ marginRight: "8px" }} /> ประเภทการลา
            </h3>
            <div className="chart-container doughnut">
              <Doughnut
                data={typeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                  },
                }}
              />
            </div>
          </div>

          <div className="chart-card small">
            <h3>
              <FaClipboardList style={{ marginRight: "8px" }} /> สถานะคำขอ
            </h3>
            <div className="chart-container doughnut">
              <Doughnut
                data={statusChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom" },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {statistics?.byDepartment &&
          Object.keys(statistics.byDepartment).length > 0 && (
            <div className="department-table-card">
              <h3>
                <FaBuilding style={{ marginRight: "8px" }} /> การลาแยกตามแผนก
              </h3>
              <table className="department-table">
                <thead>
                  <tr>
                    <th>แผนก</th>
                    <th>จำนวนวันลา</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(statistics.byDepartment)
                    .sort((a, b) => b[1] - a[1])
                    .map(([dept, days]) => (
                      <tr key={dept}>
                        <td>{dept}</td>
                        <td>{days} วัน</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  );
};

export default Reports;
