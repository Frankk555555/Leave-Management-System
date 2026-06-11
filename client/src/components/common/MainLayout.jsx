import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { FaBars } from "react-icons/fa";
import "./MainLayout.css";

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="main-layout">
      {/* Mobile Header: Visible only on screen widths <= 1024px */}
      <header className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
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
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Main Content Area */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
