import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaClock } from "react-icons/fa";
import useAnchoredPopup from "./useAnchoredPopup";
import "./PickerControls.css";

export default function TimeInput({ type, value = "", onChange, name, id, required, disabled, min, max, step, className = "", ...props }) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState("09");
  const [minute, setMinute] = useState("00");
  const [invalid, setInvalid] = useState(false);
  const nativeRef = useRef(null);
  const panelId = useId();
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, position } = useAnchoredPopup(open, close, 280);
  useEffect(() => {
    if (open) panelRef.current?.querySelector("input")?.focus({ preventScroll: true });
  }, [open, panelRef]);
  const valid = hour !== "" && minute !== "" && Number.isInteger(Number(hour)) && Number(hour) >= 0 && Number(hour) <= 23 && Number.isInteger(Number(minute)) && Number(minute) >= 0 && Number(minute) <= 59;
  const candidate = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const inRange = (time) => (!min || time >= min) && (!max || time <= max);
  const choose = (next) => {
    setInvalid(false);
    const target = { name, id, value: next, type: "time" };
    onChange?.({ target, currentTarget: target }); close(); triggerRef.current?.focus({ preventScroll: true });
  };
  return <div className="ui-time-field">
    <input ref={nativeRef} className="ui-native-value" type="time" value={value} name={name} min={min} max={max} step={step} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onChange={() => {}}
      onInvalid={(event) => { event.preventDefault(); setInvalid(true); triggerRef.current?.focus({ preventScroll: true }); }} />
    <button {...props} type="button" ref={triggerRef} id={id} disabled={disabled} className={`ui-time-trigger ${className}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} aria-required={required || undefined} aria-invalid={invalid || undefined}
      onClick={() => { const [h, m] = (value || "09:00").split(":"); setHour(h); setMinute(m); setOpen(!open); }}><FaClock aria-hidden="true" /><span>{value ? `${value} น.` : "เลือกเวลา"}</span></button>
    {invalid && <span className="ui-field-error" role="alert">กรุณาเลือกเวลาภายในช่วงที่กำหนด</span>}
    {open && createPortal(<div ref={panelRef} id={panelId} role="dialog" aria-label="เลือกเวลา" className="ui-picker-panel ui-time-panel" style={position}>
      <strong>เลือกเวลา <small>รูปแบบ 24 ชั่วโมง</small></strong>
      <div className="ui-time-values"><label>ชั่วโมง<input type="number" min="0" max="23" value={hour} onChange={(event) => setHour(event.target.value)} /></label><span>:</span><label>นาที<input type="number" min="0" max="59" value={minute} onChange={(event) => setMinute(event.target.value)} /></label></div>
      <div className="ui-time-presets">{["08:30", "09:00", "12:00", "13:00", "16:30", "17:00"].map((time) => <button key={time} type="button" disabled={!inRange(time)} onClick={() => choose(time)}>{time}</button>)}</div>
      <div className="ui-time-actions">{!required && <button type="button" onClick={() => choose("")}>ล้าง</button>}<button type="button" disabled={!valid || !inRange(candidate)} onClick={() => choose(candidate)}>เลือกเวลา</button></div>
    </div>, document.body)}
  </div>;
}
