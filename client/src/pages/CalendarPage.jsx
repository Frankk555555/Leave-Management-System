import React, { useEffect, useMemo, useRef, useState } from "react";
import Calendar from "react-calendar";
import { useNavigate } from "react-router-dom";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaExclamationCircle, FaGlassCheers, FaHistory, FaPlus, FaRedo } from "react-icons/fa";
import { holidaysAPI, leaveRequestsAPI } from "../services/api";
import Loading from "../components/common/Loading";
import { getLeaveTypeCode, getLeaveTypeIcon, getLeaveTypeName } from "../utils/leaveTypeUtils";
import SEO, { SEOConfig } from "../components/common/SEO";
import "react-calendar/dist/Calendar.css";
import "./CalendarPage.css";

const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const ACTIVE_STATUSES = new Set(["pending", "approved", "confirmed"]);
const STATUS_META = {
  pending: { label: "รอพิจารณา", className: "is-pending" },
  approved: { label: "อนุมัติแล้ว", className: "is-approved" },
  confirmed: { label: "ยืนยันแล้ว", className: "is-confirmed" },
};
const pad = (value) => String(value).padStart(2, "0");
const toDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

const CalendarPage = () => {
  const navigate = useNavigate();
  const pickerRef = useRef(null);
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [activeStartDate, setActiveStartDate] = useState(startOfMonth(today));
  const [holidaysByYear, setHolidaysByYear] = useState({});
  const [leaveRequests, setLeaveRequests] = useState([]);
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
      setError("ไม่สามารถโหลดข้อมูลปฏิทินได้ กรุณาลองอีกครั้ง");
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
        const [holidaysRes, leavesRes] = await Promise.all([
          holidaysAPI.getAll(today.getFullYear()), leaveRequestsAPI.getMyRequests(),
        ]);
        if (cancelled) return;
        setHolidaysByYear({ [today.getFullYear()]: holidaysRes.data || [] });
        setLeaveRequests((leavesRes.data || []).filter((leave) => ACTIVE_STATUSES.has(leave.status)));
      } catch (fetchError) {
        if (!cancelled) setError("ไม่สามารถโหลดข้อมูลปฏิทินได้ กรุณาลองอีกครั้ง");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [today]);

  useEffect(() => {
    if (!loading && !holidaysByYear[activeYear]) fetchYear(activeYear);
    // The active year is the cache key; changing cached years should not refetch it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeYear]);

  const holidayMap = useMemo(() => {
    const map = new Map();
    Object.values(holidaysByYear).flat().forEach((item) => {
      const key = toDateKey(item.date);
      map.set(key, [...(map.get(key) || []), item]);
    });
    return map;
  }, [holidaysByYear]);

  const leaveMap = useMemo(() => {
    const map = new Map();
    leaveRequests.forEach((leave) => {
      const cursor = new Date(`${toDateKey(leave.startDate)}T12:00:00`);
      const endKey = toDateKey(leave.endDate);
      while (toDateKey(cursor) <= endKey) {
        const key = toDateKey(cursor);
        map.set(key, [...(map.get(key) || []), leave]);
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [leaveRequests]);

  const selectedKey = toDateKey(selectedDate);
  const selectedHolidays = holidayMap.get(selectedKey) || [];
  const selectedLeaves = leaveMap.get(selectedKey) || [];
  const selectDate = (date) => {
    setSelectedDate(date);
    if (date.getMonth() !== activeStartDate.getMonth() || date.getFullYear() !== activeYear) setActiveStartDate(startOfMonth(date));
  };
  const goToToday = () => {
    const current = new Date();
    setSelectedDate(current);
    setActiveStartDate(startOfMonth(current));
  };
  const openPicker = () => pickerRef.current?.showPicker ? pickerRef.current.showPicker() : pickerRef.current?.click();

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return null;
    const key = toDateKey(date);
    const classes = [];
    if (holidayMap.has(key)) classes.push("cal-page-has-holiday");
    if (leaveMap.has(key)) {
      classes.push("cal-page-has-leave");
      const primaryLeave = leaveMap.get(key)[0];
      const leaveCode = getLeaveTypeCode(primaryLeave.leaveType);
      if (leaveCode) classes.push(`cal-page-leave-${leaveCode}`);
    }
    if (leaveMap.has(key) && (isWeekend(date) || holidayMap.has(key))) classes.push("cal-page-non-working-leave");
    return classes.join(" ");
  };
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const key = toDateKey(date);
    const dayHolidays = holidayMap.get(key) || [];
    const dayLeaves = leaveMap.get(key) || [];
    if (!dayHolidays.length && !dayLeaves.length) return null;
    const visibleLeaves = dayLeaves.slice(0, dayHolidays.length ? 1 : 2);
    const hiddenCount = dayLeaves.length - visibleLeaves.length;
    return <span className="cal-page-tile-events" aria-hidden="true">
      {dayHolidays.length > 0 && <span className="cal-page-tile-band is-holiday"><FaGlassCheers /></span>}
      {visibleLeaves.map((leave) => <span key={leave.id || leave._id} className={`cal-page-tile-band is-leave type-${getLeaveTypeCode(leave.leaveType)}`}>{getLeaveTypeIcon(leave.leaveType)}</span>)}
      {hiddenCount > 0 && <span className="cal-page-more-count">+{hiddenCount}</span>}
    </span>;
  };

  const yearOptions = Array.from({ length: 11 }, (_, index) => today.getFullYear() - 5 + index);
  const upcoming = Object.values(holidaysByYear).flat()
    .filter((holiday) => toDateKey(holiday.date) >= toDateKey(today))
    .sort((a, b) => toDateKey(a.date).localeCompare(toDateKey(b.date))).slice(0, 5);

  if (loading) return <><SEO {...SEOConfig.calendar} /><Loading size="fullpage" text="กำลังโหลดปฏิทิน..." /></>;

  return <>
    <SEO {...SEOConfig.calendar} />
    <main className="calendar-page">
      <header className="cal-page-header">
        <div><h1>ปฏิทินวันหยุดและวันลา</h1><p>ดูวันหยุดราชการและวันลาของคุณ</p></div>
        <button type="button" className="cal-page-primary-action" onClick={() => navigate(`/leave-request?date=${selectedKey}`)}><FaPlus aria-hidden="true" />ยื่นคำขอลา</button>
      </header>

      {error && <div className="cal-page-error" role="alert"><FaExclamationCircle aria-hidden="true" /><span>{error}</span><button type="button" onClick={() => fetchYear(activeYear)}><FaRedo aria-hidden="true" /> ลองอีกครั้ง</button></div>}

      <div className="cal-page-layout">
        <section className="cal-page-calendar-card" aria-label="ปฏิทินวันลา">
          <div className="cal-page-calendar-toolbar">
            <div className="cal-page-step-controls">
              <button type="button" onClick={() => setActiveStartDate(new Date(activeYear, activeStartDate.getMonth() - 1, 1))} aria-label="เดือนก่อนหน้า"><FaChevronLeft aria-hidden="true" /></button>
              <button type="button" className="cal-page-today-button" onClick={goToToday}>วันนี้</button>
              <button type="button" onClick={() => setActiveStartDate(new Date(activeYear, activeStartDate.getMonth() + 1, 1))} aria-label="เดือนถัดไป"><FaChevronRight aria-hidden="true" /></button>
            </div>
            <div className="cal-page-date-controls">
              <label><span>เดือน</span><select value={activeStartDate.getMonth()} onChange={(event) => setActiveStartDate(new Date(activeYear, Number(event.target.value), 1))}>{MONTHS.map((month, index) => <option value={index} key={month}>{month}</option>)}</select></label>
              <label><span>ปี</span><select value={activeYear} onChange={(event) => setActiveStartDate(new Date(Number(event.target.value), activeStartDate.getMonth(), 1))}>{yearOptions.map((year) => <option value={year} key={year}>พ.ศ. {year + 543}</option>)}</select></label>
              <button type="button" className="cal-page-picker-button" onClick={openPicker}><FaCalendarAlt aria-hidden="true" /><span>เลือกวันที่</span></button>
              <input ref={pickerRef} className="cal-page-native-picker" type="date" aria-label="เลือกวัน เดือน และปี" value={selectedKey} onChange={(event) => event.target.value && selectDate(new Date(`${event.target.value}T12:00:00`))} />
            </div>
          </div>
          <div className="cal-page-month-heading" aria-live="polite"><strong>{MONTHS[activeStartDate.getMonth()]} {activeYear + 543}</strong>{yearLoading && <span>กำลังโหลดวันหยุด...</span>}</div>
          <Calendar activeStartDate={activeStartDate} onActiveStartDateChange={({ activeStartDate: next }) => next && setActiveStartDate(startOfMonth(next))} onChange={selectDate} value={selectedDate} locale="th-TH" showNavigation={false} showNeighboringMonth tileClassName={tileClassName} tileContent={tileContent} />
          <div className="cal-page-legend" aria-label="คำอธิบายสัญลักษณ์"><span><i className="cal-page-legend-swatch is-holiday"><FaGlassCheers aria-hidden="true" /></i> วันหยุดราชการ</span><span><i className="cal-page-legend-swatch is-leave">{getLeaveTypeIcon("sick")}</i> วันทำการที่ลา</span><span><i className="cal-page-legend-swatch is-leave is-soft">{getLeaveTypeIcon("sick")}</i> วันหยุดในช่วงคำขอ</span></div>
        </section>

        <aside className="cal-page-agenda" aria-label="รายละเอียดวันที่เลือก">
          <div className="cal-page-selected-date"><span className="cal-page-selected-day">{selectedDate.getDate()}</span><div><p>{selectedDate.toLocaleDateString("th-TH", { weekday: "long" })}</p><h2>{selectedDate.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</h2></div></div>
          <div className="cal-page-agenda-content" role="status" aria-live="polite">
            {selectedHolidays.map((holiday) => <article className="cal-page-event is-holiday" key={holiday.id || holiday._id}><span className="cal-page-event-icon"><FaGlassCheers aria-hidden="true" /></span><div><span className="cal-page-event-kind">วันหยุดราชการ</span><h3>{holiday.name}</h3>{holiday.description && <p>{holiday.description}</p>}</div></article>)}
            {selectedLeaves.map((leave) => { const status = STATUS_META[leave.status] || STATUS_META.pending; return <article className="cal-page-event is-leave" key={leave.id || leave._id}><span className="cal-page-event-icon">{getLeaveTypeIcon(leave.leaveType)}</span><div><span className={`cal-page-status ${status.className}`}>{status.label}</span><h3>{getLeaveTypeName(leave.leaveType)}</h3>{leave.reason && <p>{leave.reason}</p>}</div></article>; })}
            {!selectedHolidays.length && !selectedLeaves.length && <div className="cal-page-empty-agenda"><span className="cal-page-empty-icon"><FaCalendarAlt aria-hidden="true" /></span><h3>วันนี้ยังไม่มีรายการ</h3><p>คุณสามารถเลือกวันอื่น หรือเริ่มยื่นคำขอลาสำหรับวันนี้ได้</p></div>}
          </div>
          <div className="cal-page-agenda-actions"><button type="button" onClick={() => navigate(`/leave-request?date=${selectedKey}`)}><FaPlus aria-hidden="true" /> ยื่นลาวันนี้</button><button type="button" className="is-secondary" onClick={() => navigate("/leave-history")}><FaHistory aria-hidden="true" /> ดูประวัติการลา</button></div>

          <section className="cal-page-side-section" aria-labelledby="calendar-legend-title">
            <h2 id="calendar-legend-title">สัญลักษณ์ในปฏิทิน</h2>
            <div className="cal-page-detail-legend">
              <div><span className="cal-page-legend-icon is-holiday"><FaGlassCheers aria-hidden="true" /></span><span><strong>วันหยุดราชการ</strong><small>วันหยุดตามประกาศ</small></span></div>
              <div><span className="cal-page-legend-icon is-sick">{getLeaveTypeIcon("sick")}</span><span><strong>ลาป่วย</strong><small>สีเขียว</small></span></div>
              <div><span className="cal-page-legend-icon is-personal">{getLeaveTypeIcon("personal")}</span><span><strong>ลากิจส่วนตัว</strong><small>สีคราม</small></span></div>
              <div><span className="cal-page-legend-icon is-vacation">{getLeaveTypeIcon("vacation")}</span><span><strong>ลาพักผ่อน</strong><small>สีส้ม</small></span></div>
            </div>
          </section>

          <section className="cal-page-side-section" aria-labelledby="upcoming-holidays-title">
            <div className="cal-page-side-heading">
              <h2 id="upcoming-holidays-title">วันหยุดที่จะถึง</h2>
              <span>{upcoming.length} รายการ</span>
            </div>
            <div className="cal-page-upcoming-list">
              {upcoming.length ? upcoming.map((holiday) => {
                const holidayDate = new Date(`${toDateKey(holiday.date)}T12:00:00`);
                return <article className="cal-page-upcoming-item" key={holiday.id || holiday._id}>
                  <time dateTime={toDateKey(holiday.date)}><strong>{holidayDate.getDate()}</strong><span>{holidayDate.toLocaleDateString("th-TH", { month: "short" })}</span></time>
                  <div><h3>{holiday.name}</h3><p>{holidayDate.toLocaleDateString("th-TH", { weekday: "long", year: "numeric" })}</p></div>
                </article>;
              }) : <p className="cal-page-upcoming-empty">ยังไม่มีวันหยุดที่กำลังจะมาถึง</p>}
            </div>
          </section>
        </aside>
      </div>
    </main>
  </>;
};

export default CalendarPage;
