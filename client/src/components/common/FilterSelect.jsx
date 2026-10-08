import React, { Children, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaCheck, FaChevronDown } from "react-icons/fa";
import useAnchoredPopup from "./useAnchoredPopup";
import "./PickerControls.css";

export default function FilterSelect({ children, value, onChange, className = "", disabled, required, name, id, ...props }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [invalid, setInvalid] = useState(false);
  const listId = useId();
  const close = useCallback(() => setOpen(false), []);
  const { triggerRef, panelRef, position } = useAnchoredPopup(open, close);
  const options = Children.toArray(children).flatMap((child) => child?.type === React.Fragment ? Children.toArray(child.props.children) : [child]).filter((child) => child?.type === "option");
  const selected = options.findIndex((option) => String(option.props.value) === String(value));
  const search = useRef({ text: "", time: 0 });
  useEffect(() => { if (disabled) close(); }, [disabled, close]);
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const option = panel?.querySelector(`[data-index="${active}"]`);
    if (!option) return;
    // Scroll only the list, never its ancestors (including the page).
    const top = option.getBoundingClientRect().top - panel.getBoundingClientRect().top - panel.clientTop;
    const bottom = top + option.offsetHeight;
    if (top < 0) panel.scrollTop += top;
    else if (bottom > panel.clientHeight) panel.scrollTop += bottom - panel.clientHeight;
  }, [open, active, panelRef]);
  const choose = (index) => {
    const option = options[index];
    if (!option || option.props.disabled) return;
    const target = { value: String(option.props.value), name, id };
    setInvalid(false);
    onChange?.({ target, currentTarget: target });
    close();
    triggerRef.current?.focus({ preventScroll: true });
  };
  const move = (direction) => {
    let next = active;
    for (let count = 0; count < options.length; count++) {
      next = (next + direction + options.length) % options.length;
      if (!options[next].props.disabled) break;
    }
    setActive(next);
  };
  const keyDown = (event) => {
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!open) { setActive(Math.max(selected, 0)); setOpen(true); return; }
      if (event.key === "ArrowDown") move(1);
      else if (event.key === "ArrowUp") move(-1);
      else if (event.key === "Home") setActive(options.findIndex((option) => !option.props.disabled));
      else if (event.key === "End") setActive(options.findLastIndex((option) => !option.props.disabled));
      else choose(active);
    } else if (event.key === "Tab") close();
    else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      const now = Date.now();
      search.current.text = (now - search.current.time > 700 ? "" : search.current.text) + event.key;
      search.current.time = now;
      const index = options.findIndex((option) => !option.props.disabled && Children.toArray(option.props.children).join("").toLocaleLowerCase().startsWith(search.current.text.toLocaleLowerCase()));
      if (index >= 0) { setActive(index); setOpen(true); }
    }
  };
  return <>
    <select className="ui-native-value" value={value} name={name} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onChange={() => {}}
      onInvalid={(event) => { event.preventDefault(); setInvalid(true); triggerRef.current?.focus({ preventScroll: true }); }}>
      {children}
    </select>
    <button {...props} id={id} type="button" ref={triggerRef} disabled={disabled}
      className={`ui-filter-select ${className}`} role="combobox" aria-haspopup="listbox"
      aria-expanded={open} aria-controls={open ? listId : undefined}
      aria-required={required || undefined} aria-invalid={invalid || undefined}
      aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
      onKeyDown={keyDown} onClick={() => { setActive(Math.max(selected, 0)); setOpen(!open); }}>
      <span>{options[selected]?.props.children || "เลือก"}</span><FaChevronDown aria-hidden="true" />
    </button>
    {open && createPortal(<div ref={panelRef} id={listId} role="listbox" aria-label={props["aria-label"] || "ตัวเลือก"} className="ui-picker-panel ui-select-list" style={position}>
      {options.map((option, index) => <div key={option.key || index} id={`${listId}-${index}`} role="option"
        aria-selected={index === selected} aria-disabled={!!option.props.disabled} data-index={index}
        className={`ui-select-option ${index === active ? "is-active" : ""} ${index === selected ? "is-selected" : ""}`}
        onPointerDown={(event) => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
        <span>{option.props.children}</span>{index === selected && <FaCheck aria-hidden="true" />}
      </div>)}
    </div>, document.body)}
  </>;
}
