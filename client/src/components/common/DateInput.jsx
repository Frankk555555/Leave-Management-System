import React, { useId, useRef, useState } from "react";
import DatePicker from "./DatePicker";

const parseDate = (value) => value ? new Date(`${value}T00:00:00`) : undefined;
export default function DateInput({ type, value = "", onChange, name, id, min, max, required, disabled, className = "", ...props }) {
  const wrapper = useRef(null);
  const errorId = useId();
  const [invalid, setInvalid] = useState(false);
  const date = parseDate(value);
  const change = (selected) => {
    const next = selected ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}` : "";
    setInvalid(false);
    const target = { name, id, value: next, type: "date" };
    onChange?.({ target, currentTarget: target });
  };
  return <div className="ui-date-field" ref={wrapper}>
    <input className="ui-native-value" type="date" value={value} name={name} min={min} max={max} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onChange={() => {}}
      onInvalid={(event) => { event.preventDefault(); setInvalid(true); wrapper.current?.querySelector("button")?.focus({ preventScroll: true }); }} />
    <DatePicker {...props} id={id} value={date} minDate={parseDate(min)} maxDate={parseDate(max)} disabled={disabled} onChange={change}
      className={`ui-date-input ${className}`} clearable={!required} aria-required={required || undefined} aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : props["aria-describedby"]}
      label={date ? date.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" }) : "เลือกวันที่"} />
    {invalid && <span id={errorId} className="ui-field-error" role="alert">กรุณาเลือกวันที่{min || max ? "ภายในช่วงที่กำหนด" : ""}</span>}
  </div>;
}
