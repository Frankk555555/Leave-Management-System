import React, { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";
import { useNavigate } from "react-router-dom";
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaExclamationCircle,
  FaGlassCheers,
  FaPlus,
  FaRedo,
  FaUserFriends,
} from "react-icons/fa";
import { holidaysAPI, leaveRequestsAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loading from "../components/common/Loading";
import {
  getLeaveTypeCode,
  getLeaveTypeIcon,
  getLeaveTypeName,
} from "../utils/leaveTypeUtils";
import SEO, { SEOConfig } from "../components/common/SEO";
import "react-calendar/dist/Calendar.css";
import "./CalendarPage.css";
import "./TeamCalendar.css";

const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const pad = (value) => String(value).padStart(2, "0");
const toDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

const TeamCalendar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const pickerRef = useRef(null);
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeStartDate, setActiveStartDate] = useState(startOfMonth(today));
  const [holidaysByYear, setHolidaysByYear] = useState({});
  const [teamLeaves, setTeamLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearLoading, setYearLoading] = useState(false);
  const [error, setError] = useState("");
  const activeYear = activeStartDate.getFullYear();

  const fetchYear = async (year) => {
    setError("");
    setYearLoading(true);
    try {
      const response = await holidaysAPI.getAll(year);
      setHolidaysByYear((current) => ({ ...current, [year]: response.data || [] }));
    } catch (fetchError) {
      console.error("Error fetching holidays:", fetchError);
      setError("ไม่สามารถโหลดข้อมูลวันหยุดได้ กรุณาลองอีกครั้ง");
    } finally {
      setYearLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [holidaysRes, teamRes] = await Promise.all([
          holidaysAPI.getAll(today.getFullYear()),
          leaveRequestsAPI.getTeam(),
        ]);
        if (cancelled) return;
        setHolidaysByYear({ [today.getFullYear()]: holidaysRes.data || [] });
        setTeamLeaves(teamRes.data || []);
      } catch (fetchError) {
        if (!cancelled) {
          console.error("Error loading team calendar:", fetchError);
          setError("ไม่สามารถโหลดข้อมูลปฏิทินทีมได้ กรุณาลองอีกครั้ง");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [today]);

  useEffect(() => {
    if (!loading && !holidaysByYear[activeYear]) {
      fetchYear(activeYear);
    }
  }, [activeYear]);

  const holidayMap = useMemo(() => {
    const map = new Map();
    Object.values(holidaysByYear)
      .flat()
      .forEach((item) => {
        const key = toDateKey(item.date);
        map.set(key, [...(map.get(key) || []), item]);
      });
    return map;
  }, [holidaysByYear]);

  const teamLeaveMap = useMemo(() => {
    const map = new Map();
    teamLeaves.forEach((leave) => {
      // Exclude oneself
      const leaveUserId = leave.userId || leave.user?.id;
      if (leaveUserId === user?.id) return;

      const startKey = toDateKey(leave.startDate);
      const endKey = toDateKey(leave.endDate);
      const cursor = new Date(`${startKey}T12:00:00`);

      while (toDateKey(cursor) <= endKey) {
        const key = toDateKey(cursor);
        map.set(key, [...(map.get(key) || []), leave]);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [teamLeaves, user?.id]);

  const selectedKey = toDateKey(selectedDate);
  const selectedHolidays = holidayMap.get(selectedKey) || [];
  const selectedLeaves = teamLeaveMap.get(selectedKey) || [];

  const selectDate = (date) => {
    setSelectedDate(date);
    if (
      date.getMonth() !== activeStartDate.getMonth() ||
      date.getFullYear() !== activeYear
    ) {
      setActiveStartDate(startOfMonth(date));
    }
  };

  const goToToday = () => {
    const current = new Date();
    setSelectedDate(current);
    setActiveStartDate(startOfMonth(current));
  };

  const openPicker = () => {
    if (pickerRef.current?.showPicker) {
      pickerRef.current.showPicker();
    } else {
      pickerRef.current?.click();
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return null;
    const key = toDateKey(date);
    const classes = [];
    if (holidayMap.has(key)) classes.push("cal-page-has-holiday");
    if (teamLeaveMap.has(key)) {
      classes.push("cal-page-has-leave");
      const dayLeaves = teamLeaveMap.get(key);
      const primaryLeave = dayLeaves[0];
      const leaveCode = getLeaveTypeCode(primaryLeave?.leaveType);
      if (leaveCode) classes.push(`cal-page-leave-${leaveCode}`);
    }
    if (teamLeaveMap.has(key) && (isWeekend(date) || holidayMap.has(key))) {
      classes.push("cal-page-non-working-leave");
    }
    return classes.join(" ");
  };

  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const key = toDateKey(date);
    const dayHolidays = holidayMap.get(key) || [];
    const dayLeaves = teamLeaveMap.get(key) || [];
    if (!dayHolidays.length && !dayLeaves.length) return null;

    const visibleLeaves = dayLeaves.slice(0, dayHolidays.length ? 1 : 2);
    const hiddenCount = dayLeaves.length - visibleLeaves.length;

    return (
      <span className="cal-page-tile-events" aria-hidden="true">
        {dayHolidays.length > 0 && (
          <span className="cal-page-tile-band is-holiday">
            <FaGlassCheers />
          </span>
        )}
        {visibleLeaves.map((leave, idx) => (
          <span
            key={leave.id || leave._id || idx}
            className={`cal-page-tile-band is-leave type-${getLeaveTypeCode(
              leave.leaveType
            )}`}
          >
            {getLeaveTypeIcon(leave.leaveType)}
          </span>
        ))}
        {hiddenCount > 0 && (
          <span className="cal-page-more-count">+{hiddenCount}</span>
        )}
      </span>
    );
  };

  const yearOptions = Array.from(
    { length: 11 },
    (_, index) => today.getFullYear() - 5 + index
  );

  const upcomingTeamLeaves = useMemo(() => {
    const todayKey = toDateKey(today);
    return teamLeaves
      .filter((leave) => {
        const leaveUserId = leave.userId || leave.user?.id;
        if (leaveUserId === user?.id) return false;
        return toDateKey(leave.endDate || leave.startDate) >= todayKey;
      })
      .sort((a, b) => toDateKey(a.startDate).localeCompare(toDateKey(b.startDate)))
      .slice(0, 5);
  }, [teamLeaves, today, user?.id]);

  if (loading) {
    return (
      <>
        <SEO {...SEOConfig.teamCalendar} />
        <Loading size="fullpage" text="กำลังโหลดปฏิทินทีม..." />
      </>
    );
  }

  return (
    <>
      <SEO {...SEOConfig.teamCalendar} />
      <main className="calendar-page team-calendar-page">
        <header className="cal-page-header">
          <div>
            <h1>ปฏิทินวันลาทีม</h1>
            <p>ดูวันหยุดราชการและวันลาของเพื่อนร่วมงานในทีม</p>
          </div>
          <div className="team-cal-header-actions">
            <button
              type="button"
              className="team-cal-secondary-action"
              onClick={() => navigate("/calendar")}
            >
              <FaCalendarAlt aria-hidden="true" />
              <span>ปฏิทินส่วนตัว</span>
            </button>
            {user?.role !== "admin" && (
              <button
                type="button"
                className="cal-page-primary-action"
                onClick={() => navigate(`/leave-request?date=${selectedKey}`)}
              >
                <FaPlus aria-hidden="true" />
                <span>ยื่นคำขอลา</span>
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="cal-page-error" role="alert">
            <FaExclamationCircle aria-hidden="true" />
            <span>{error}</span>
            <button type="button" onClick={() => fetchYear(activeYear)}>
              <FaRedo aria-hidden="true" /> ลองอีกครั้ง
            </button>
          </div>
        )}

        <div className="cal-page-layout">
          {/* Left Column: Calendar Card with Toolbar */}
          <section className="cal-page-calendar-card" aria-label="ปฏิทินวันลาทีม">
            <div className="cal-page-calendar-toolbar">
              <div className="cal-page-step-controls">
                <button
                  type="button"
                  onClick={() =>
                    setActiveStartDate(
                      new Date(activeYear, activeStartDate.getMonth() - 1, 1)
                    )
                  }
                  aria-label="เดือนก่อนหน้า"
                >
                  <FaChevronLeft aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="cal-page-today-button"
                  onClick={goToToday}
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveStartDate(
                      new Date(activeYear, activeStartDate.getMonth() + 1, 1)
                    )
                  }
                  aria-label="เดือนถัดไป"
                >
                  <FaChevronRight aria-hidden="true" />
                </button>
              </div>

              <div className="cal-page-date-controls">
                <label>
                  <span>เดือน</span>
                  <select
                    value={activeStartDate.getMonth()}
                    onChange={(event) =>
                      setActiveStartDate(
                        new Date(activeYear, Number(event.target.value), 1)
                      )
                    }
                  >
                    {MONTHS.map((month, index) => (
                      <option value={index} key={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>ปี</span>
                  <select
                    value={activeYear}
                    onChange={(event) =>
                      setActiveStartDate(
                        new Date(
                          Number(event.target.value),
                          activeStartDate.getMonth(),
                          1
                        )
                      )
                    }
                  >
                    {yearOptions.map((year) => (
                      <option value={year} key={year}>
                        พ.ศ. {year + 543}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="cal-page-picker-button"
                  onClick={openPicker}
                >
                  <FaCalendarAlt aria-hidden="true" />
                  <span>เลือกวันที่</span>
                </button>
                <input
                  ref={pickerRef}
                  className="cal-page-native-picker"
                  type="date"
                  aria-label="เลือกวัน เดือน และปี"
                  value={selectedKey}
                  onChange={(event) =>
                    event.target.value &&
                    selectDate(new Date(`${event.target.value}T12:00:00`))
                  }
                />
              </div>
            </div>

            <div className="cal-page-month-heading" aria-live="polite">
              <strong>
                {MONTHS[activeStartDate.getMonth()]} {activeYear + 543}
              </strong>
              {yearLoading && <span>กำลังโหลดวันหยุด...</span>}
            </div>

            <Calendar
              activeStartDate={activeStartDate}
              onActiveStartDateChange={({ activeStartDate: next }) =>
                next && setActiveStartDate(startOfMonth(next))
              }
              onChange={selectDate}
              value={selectedDate}
              locale="th-TH"
              showNavigation={false}
              showNeighboringMonth
              tileClassName={tileClassName}
              tileContent={tileContent}
            />

            <div className="cal-page-legend" aria-label="คำอธิบายสัญลักษณ์">
              <span>
                <i className="cal-page-legend-swatch is-holiday">
                  <FaGlassCheers aria-hidden="true" />
                </i>{" "}
                วันหยุดราชการ
              </span>
              <span>
                <i className="cal-page-legend-swatch is-leave">
                  {getLeaveTypeIcon("sick")}
                </i>{" "}
                วันที่มีเพื่อนร่วมงานลา
              </span>
              <span>
                <i className="cal-page-legend-swatch is-leave is-soft">
                  {getLeaveTypeIcon("sick")}
                </i>{" "}
                วันหยุดในช่วงคำขอ
              </span>
            </div>
          </section>

          {/* Right Column: Agenda Sidebar */}
          <aside className="cal-page-agenda" aria-label="รายละเอียดวันที่เลือก">
            <div className="cal-page-selected-date">
              <span className="cal-page-selected-day">
                {selectedDate.getDate()}
              </span>
              <div>
                <p>
                  {selectedDate.toLocaleDateString("th-TH", {
                    weekday: "long",
                  })}
                </p>
                <h2>
                  {selectedDate.toLocaleDateString("th-TH", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
              </div>
            </div>

            <div className="cal-page-agenda-content" role="status" aria-live="polite">
              {/* Holidays on selected date */}
              {selectedHolidays.map((holiday) => (
                <article
                  className="cal-page-event is-holiday"
                  key={holiday.id || holiday._id}
                >
                  <span className="cal-page-event-icon">
                    <FaGlassCheers aria-hidden="true" />
                  </span>
                  <div>
                    <span className="cal-page-event-kind">วันหยุดราชการ</span>
                    <h3>{holiday.name}</h3>
                    {holiday.description && <p>{holiday.description}</p>}
                  </div>
                </article>
              ))}

              {/* Team leaves on selected date */}
              {selectedLeaves.map((leave) => {
                const colleague = leave.user || leave.employee;
                const initials = colleague?.firstName
                  ? colleague.firstName.charAt(0)
                  : "U";
                const deptName = colleague?.department?.name;
                const timeSlotLabel =
                  leave.timeSlot === "morning"
                    ? "ครึ่งวันเช้า"
                    : leave.timeSlot === "afternoon"
                    ? "ครึ่งวันบ่าย"
                    : null;

                return (
                  <article
                    className="cal-page-event is-team-leave"
                    key={leave.id || leave._id}
                  >
                    <div className="team-cal-member-avatar" aria-hidden="true">
                      {initials}
                    </div>
                    <div className="team-cal-member-body">
                      <div className="team-cal-member-head">
                        <h3>
                          {colleague
                            ? `${colleague.firstName} ${colleague.lastName}`
                            : "เพื่อนร่วมงาน"}
                        </h3>
                        {deptName && (
                          <span className="team-cal-dept-badge">{deptName}</span>
                        )}
                      </div>
                      <div className="team-cal-leave-tags">
                        <span
                          className={`team-cal-type-tag type-${getLeaveTypeCode(
                            leave.leaveType
                          )}`}
                        >
                          {getLeaveTypeIcon(leave.leaveType)}
                          <span>{getLeaveTypeName(leave.leaveType)}</span>
                        </span>
                        {timeSlotLabel && (
                          <span className="team-cal-timeslot-tag">
                            {timeSlotLabel}
                          </span>
                        )}
                        <span className="team-cal-duration-tag">
                          {leave.totalDays} วัน
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Empty agenda state */}
              {!selectedHolidays.length && !selectedLeaves.length && (
                <div className="cal-page-empty-agenda">
                  <span className="cal-page-empty-icon">
                    <FaUserFriends aria-hidden="true" />
                  </span>
                  <h3>วันนี้ไม่มีเพื่อนร่วมงานลา</h3>
                  <p>
                    ไม่มีรายการลาของเพื่อนร่วมงานในทีมสำหรับวันนี้
                    คุณสามารถเลือกดูวันอื่นได้
                  </p>
                </div>
              )}
            </div>

            {/* Agenda Actions */}
            <div className="cal-page-agenda-actions">
              <button
                type="button"
                className="is-secondary"
                onClick={() => navigate("/calendar")}
              >
                <FaCalendarAlt aria-hidden="true" /> ดูปฏิทินส่วนตัว
              </button>
              {user?.role !== "admin" && (
                <button
                  type="button"
                  onClick={() => navigate(`/leave-request?date=${selectedKey}`)}
                >
                  <FaPlus aria-hidden="true" /> ยื่นคำขอลา
                </button>
              )}
            </div>

            {/* Side Section 1: Legend */}
            <section
              className="cal-page-side-section"
              aria-labelledby="team-calendar-legend-title"
            >
              <h2 id="team-calendar-legend-title">สัญลักษณ์ในปฏิทิน</h2>
              <div className="cal-page-detail-legend">
                <div>
                  <span className="cal-page-legend-icon is-holiday">
                    <FaGlassCheers aria-hidden="true" />
                  </span>
                  <span>
                    <strong>วันหยุดราชการ</strong>
                    <small>วันหยุดตามประกาศ</small>
                  </span>
                </div>
                <div>
                  <span className="cal-page-legend-icon is-sick">
                    {getLeaveTypeIcon("sick")}
                  </span>
                  <span>
                    <strong>ลาป่วย</strong>
                    <small>สีเขียว</small>
                  </span>
                </div>
                <div>
                  <span className="cal-page-legend-icon is-personal">
                    {getLeaveTypeIcon("personal")}
                  </span>
                  <span>
                    <strong>ลากิจส่วนตัว</strong>
                    <small>สีคราม</small>
                  </span>
                </div>
                <div>
                  <span className="cal-page-legend-icon is-vacation">
                    {getLeaveTypeIcon("vacation")}
                  </span>
                  <span>
                    <strong>ลาพักผ่อน</strong>
                    <small>สีส้ม</small>
                  </span>
                </div>
              </div>
            </section>

            {/* Side Section 2: Upcoming Team Leaves */}
            <section
              className="cal-page-side-section"
              aria-labelledby="upcoming-team-leaves-title"
            >
              <div className="cal-page-side-heading">
                <h2 id="upcoming-team-leaves-title">
                  การลาของทีมที่กำลังจะมาถึง
                </h2>
                <span>{upcomingTeamLeaves.length} รายการ</span>
              </div>
              <div className="cal-page-upcoming-list">
                {upcomingTeamLeaves.length ? (
                  upcomingTeamLeaves.map((leave) => {
                    const leaveDate = new Date(
                      `${toDateKey(leave.startDate)}T12:00:00`
                    );
                    const colleague = leave.user || leave.employee;
                    return (
                      <article
                        className="cal-page-upcoming-item"
                        key={leave.id || leave._id}
                      >
                        <time dateTime={toDateKey(leave.startDate)}>
                          <strong>{leaveDate.getDate()}</strong>
                          <span>
                            {leaveDate.toLocaleDateString("th-TH", {
                              month: "short",
                            })}
                          </span>
                        </time>
                        <div>
                          <h3>
                            {colleague
                              ? `${colleague.firstName} ${colleague.lastName}`
                              : "เพื่อนร่วมงาน"}
                          </h3>
                          <p>
                            {getLeaveTypeName(leave.leaveType)} (
                            {leave.totalDays} วัน)
                          </p>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="cal-page-upcoming-empty">
                    ไม่มีการลาของทีมในช่วงนี้
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
};

export default TeamCalendar;
