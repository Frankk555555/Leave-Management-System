import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { FaBars } from "react-icons/fa";
import "./MainLayout.css";

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 1024px)").matches);
  const menuButtonRef = useRef(null);
  const layoutRef = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
    layoutRef.current?.querySelector(".main-content")?.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1024px)");
    const update = () => { setIsMobile(media.matches); if (!media.matches) setIsSidebarOpen(false); };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!isSidebarOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event) => { if (event.key === "Escape") setIsSidebarOpen(false); };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", escape);
      menuButtonRef.current?.focus({ preventScroll: true });
    };
  }, [isSidebarOpen, isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const layout = layoutRef.current;
    let start = null;
    const begin = (event) => {
      if (event.touches.length !== 1) { start = null; return; }
      let horizontalScroller = false;
      // Keep horizontal gestures inside a table's own scroll container.
      for (let node = event.target; node instanceof Element && node !== layout; node = node.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(node).overflowX) && node.scrollWidth > node.clientWidth) {
          horizontalScroller = true; break;
        }
      }
      start = { x: event.touches[0].clientX, y: event.touches[0].clientY, horizontalScroller };
    };
    const move = (event) => {
      if (!start || event.touches.length !== 1 || start.horizontalScroller) return;
      const dx = Math.abs(event.touches[0].clientX - start.x);
      const dy = Math.abs(event.touches[0].clientY - start.y);
      if (dx > 6 && dx > dy && event.cancelable) event.preventDefault();
    };
    const end = () => { start = null; };
    layout.addEventListener("touchstart", begin, { passive: true });
    layout.addEventListener("touchmove", move, { passive: false });
    layout.addEventListener("touchend", end, { passive: true });
    layout.addEventListener("touchcancel", end, { passive: true });
    return () => {
      layout.removeEventListener("touchstart", begin);
      layout.removeEventListener("touchmove", move);
      layout.removeEventListener("touchend", end);
      layout.removeEventListener("touchcancel", end);
    };
  }, [isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="main-layout" ref={layoutRef}>
      {/* Mobile Header: Visible only on screen widths <= 1024px */}
      <header className="mobile-header">
        <button
          className="hamburger-btn"
          ref={menuButtonRef}
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          aria-expanded={isSidebarOpen}
          aria-controls="main-sidebar"
        >
          <FaBars />
        </button>
        
        <div className="mobile-header-brand">
          <img
            src="/bru-logo-color.png"
            alt="BRU Logo"
            className="mobile-header-logo"
          />
          <span className="mobile-header-title">ระบบบริหารการลา</span>
        </div>

        <div className="mobile-header-actions">
          <NotificationBell />
        </div>
      </header>

      {/* Shared Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} isMobile={isMobile} />

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
