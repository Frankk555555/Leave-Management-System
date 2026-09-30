import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Calendar from "react-calendar";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import useAnchoredPopup from "./useAnchoredPopup";
import "react-calendar/dist/Calendar.css";
import "./PickerControls.css";

export default function DatePicker({ value, onChange, label = "เลือกวันที่", initialMonth, className = "", minDate, maxDate, disabled, clearable = false, ...props }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(initialMonth || value || new Date());
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, position } = useAnchoredPopup(open, close, 320);
  useEffect(() => {
    if (open) panelRef.current?.querySelector(".react-calendar__tile--active, .react-calendar__tile--now, .react-calendar__tile:enabled")?.focus({ preventScroll: true });
  }, [open, panelRef]);
  const choose = (date) => { onChange(date); close(); triggerRef.current?.focus({ preventScroll: true }); };
  return <>
    <button {...props} type="button" disabled={disabled} ref={triggerRef} className={`ui-date-trigger ${className}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined}
      onClick={() => { setMonth(initialMonth || value || new Date()); setOpen(!open); }}>
      <FaCalendarAlt aria-hidden="true" /><span>{label}</span>
    </button>
    {open && createPortal(<div ref={panelRef} id={panelId} role="dialog" aria-label="เลือกวัน เดือน และปี" className="ui-picker-panel ui-date-panel" style={position}>
      <Calendar value={value} onChange={choose} locale="th-TH" calendarType="iso8601" activeStartDate={month}
        minDate={minDate} maxDate={maxDate}
        onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setMonth(activeStartDate)}
        minDetail="decade" maxDetail="month" next2Label={null} prev2Label={null}
        nextLabel={<FaChevronRight />} prevLabel={<FaChevronLeft />} prevAriaLabel="เดือนก่อนหน้า" nextAriaLabel="เดือนถัดไป"
        navigationAriaLabel="เลือกเดือนและปี" formatMonthYear={(_, date) => date.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}
        formatYear={(_, date) => String(date.getFullYear() + 543)} />
      <div className="ui-date-footer"><span>{value?.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</span>{clearable && <button type="button" onClick={() => choose(null)}>ล้าง</button>}<button type="button" disabled={(minDate && new Date() < minDate) || (maxDate && new Date().setHours(0,0,0,0) > maxDate)} onClick={() => choose(new Date())}>วันนี้</button></div>
    </div>, document.body)}
  </>;
}
