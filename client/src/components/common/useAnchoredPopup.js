import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Portals escape cards/scroll containers; measure the actual panel to avoid clipping.
export default function useAnchoredPopup(open, onClose, width) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ visibility: "hidden" });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const anchor = triggerRef.current?.getBoundingClientRect();
      const panel = panelRef.current;
      if (!anchor || !panel) return;
      const margin = 12;
      const panelWidth = Math.min(width || Math.max(anchor.width, 200), window.innerWidth - margin * 2);
      const below = window.innerHeight - anchor.bottom - margin - 6;
      const above = anchor.top - margin - 6;
      const flip = panel.scrollHeight > below && above > below;
      const maxHeight = Math.max(0, Math.min(width ? Infinity : 320, flip ? above : below));
      const height = Math.min(panel.scrollHeight, maxHeight);
      setPosition({
        position: "fixed", width: panelWidth,
        left: Math.max(margin, Math.min(anchor.left, window.innerWidth - panelWidth - margin)),
        top: flip ? anchor.top - height - 6 : anchor.bottom + 6,
        maxHeight, visibility: "visible",
      });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panelRef.current);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!triggerRef.current?.contains(event.target) && !panelRef.current?.contains(event.target)) onClose();
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, onClose]);
  return { triggerRef, panelRef, position };
}
