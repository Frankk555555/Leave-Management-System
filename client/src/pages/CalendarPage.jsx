import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import { holidaysAPI, leaveRequestsAPI } from "../services/api";
import Loading from "../components/common/Loading";
import { getLeaveTypeCode, getLeaveTypeIcon, getLeaveTypeName } from "../utils/leaveTypeUtils";
import { FaGlassCheers } from "react-icons/fa";
import "react-calendar/dist/Calendar.css";
import "./CalendarPage.css";

const CalendarPage = () => {
  const [date, setDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [holidaysRes, leavesRes] = await Promise.all([
        holidaysAPI.getAll(new Date().getFullYear()),
        leaveRequestsAPI.getMyRequests(),
      ]);
      setHolidays(holidaysRes.data);
      setLeaveRequests(leavesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isHoliday = (date) => {
    return holidays.some((h) => {
      const holidayDate = new Date(h.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  };

  const getHolidayInfo = (date) => {
    return holidays.find((h) => {
      const holidayDate = new Date(h.date);
      return holidayDate.toDateString() === date.toDateString();
    });
  };

  const isLeaveDay = (date) => {
    return leaveRequests.some((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const getLeaveInfo = (date) => {
    return leaveRequests.find((l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    });
  };

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return null;

    const classes = [];
    if (isHoliday(date)) classes.push("holiday-tile");
    if (isLeaveDay(date)) classes.push("leave-tile");

    return classes.join(" ");
  };

  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;

    const holiday = getHolidayInfo(date);
    const leave = getLeaveInfo(date);

    if (holiday || leave) {
      return (
        <div className="tile-content">
          {holiday && (
            <span className="holiday-dot" title={holiday.name}>
              <FaGlassCheers />
            </span>
          )}
          {leave && (
            <span
              className="leave-dot"
              title={getLeaveTypeName(leave.leaveType)}
            >
              {getLeaveTypeIcon(leave.leaveType)}
            </span>
          )}
        </div>
      );
    }
    return null;
  };

  const selectedHoliday = getHolidayInfo(date);
  const selectedLeave = getLeaveInfo(date);

  if (loading) {
    return (
      <>
        <Loading size="fullpage" text="กำลังโหลด..." />
      </>
    );
  }

  return (
    <>
      <div className="calendar-page">
        <div className="page-header">
          <h1>ปฏิทินวันหยุดและวันลา</h1>
          <p>ดูวันหยุดราชการและวันลาของคุณ</p>
        </div>

        <div className="calendar-container">
          <div className="calendar-wrapper">
            <Calendar
              onChange={setDate}
              value={date}
              locale="th-TH"
              tileClassName={tileClassName}
              tileContent={tileContent}
            />
          </div>

          <div className="calendar-sidebar">
            <div className="selected-date-card">
              <h3>
                {date.toLocaleDateString("th-TH", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>

              {selectedHoliday && (
                <div className="event-item holiday-event">
                  <span className="event-icon" style={{ color: "#d97706" }}><FaGlassCheers /></span>
                  <div className="event-info">
                    <h4>{selectedHoliday.name}</h4>
                    <p>{selectedHoliday.description}</p>
                  </div>
                </div>
              )}

              {selectedLeave && (
                <div className="event-item leave-event">
                  <span className="event-icon" style={{ color: "#059669" }}>
                    {getLeaveTypeIcon(selectedLeave.leaveType)}
                  </span>
                  <div className="event-info">
                    <h4>{getLeaveTypeName(selectedLeave.leaveType)}</h4>
                    <p>{selectedLeave.reason}</p>
                  </div>
                </div>
              )}

              {!selectedHoliday && !selectedLeave && (
                <p className="no-events">ไม่มีกิจกรรมในวันนี้</p>
              )}
            </div>

            <div className="legend-card">
              <h3>สัญลักษณ์</h3>
              <div className="legend-items">
                <div className="legend-item">
                  <span className="legend-icon" style={{ color: "#d97706" }}><FaGlassCheers /></span>
                  <span>วันหยุดราชการ</span>
                </div>
                <div className="legend-item">
                  <span className="legend-icon" style={{ color: "#059669" }}>{getLeaveTypeIcon("sick")}</span>
                  <span>ลาป่วย</span>
                </div>
                <div className="legend-item">
                  <span className="legend-icon" style={{ color: "#6366f1" }}>{getLeaveTypeIcon("personal")}</span>
                  <span>ลากิจ</span>
                </div>
                <div className="legend-item">
                  <span className="legend-icon" style={{ color: "#d97706" }}>{getLeaveTypeIcon("vacation")}</span>
                  <span>ลาพักร้อน</span>
                </div>
              </div>
            </div>

            <div className="upcoming-card">
              <h3>วันหยุดที่จะถึง</h3>
              <div className="upcoming-list">
                {holidays
                  .filter((h) => new Date(h.date) >= new Date())
                  .slice(0, 5)
                  .map((h) => (
                    <div key={h.id || h._id} className="upcoming-item">
                      <span className="upcoming-date">
                        {new Date(h.date).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span className="upcoming-name">{h.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CalendarPage;
