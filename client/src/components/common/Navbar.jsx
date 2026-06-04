import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import NotificationBell from "./NotificationBell";
import "./Navbar.css";

// React Icons
import {
  FaGraduationCap,
  FaChartBar,
  FaEdit,
  FaClipboardList,
  FaCalendarAlt,
  FaUsers,
  FaCog,
  FaFileAlt,
  FaUsersCog,
  FaCalendarCheck,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBookOpen,
  FaUser,
} from "react-icons/fa";

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
    if (menuOpen) setAdminDropdownOpen(false);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setAdminDropdownOpen(false);
  };

  const toggleAdminDropdown = (e) => {
    e.preventDefault();
    setAdminDropdownOpen(!adminDropdownOpen);
  };

  return (
    <nav className="navbar">
      <button
        className="menu-toggle"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        {menuOpen ? <FaTimes /> : <FaBars />}
      </button>

      <div className="navbar-brand">
        <h1>
          <img
            src="/bru-logo-color.png"
            alt="BRU Logo"
            className="navbar-logo"
          />{" "}
          ระบบบริหารการลา
        </h1>
      </div>

      <div className={`navbar-menu ${menuOpen ? "open" : ""}`}>
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          onClick={closeMenu}
        >
          <FaChartBar style={{ marginRight: "0.3rem" }} /> หน้าหลัก
        </NavLink>
        {!isAdmin && (
          <>
            <NavLink
              to="/leave-request"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <FaEdit style={{ marginRight: "0.3rem" }} /> ยื่นลา
            </NavLink>
            <NavLink
              to="/leave-history"
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
              onClick={closeMenu}
            >
              <FaClipboardList style={{ marginRight: "0.3rem" }} /> ประวัติการลา
            </NavLink>
          </>
        )}
        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          onClick={closeMenu}
        >
          <FaCalendarAlt style={{ marginRight: "0.3rem" }} /> ปฏิทิน
        </NavLink>
        {!isAdmin && (
          <NavLink
            to="/team-calendar"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
            onClick={closeMenu}
          >
            <FaUsers style={{ marginRight: "0.3rem" }} /> วันลาทีม
          </NavLink>
        )}
        <NavLink
          to="/forms"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          onClick={closeMenu}
        >
          <FaFileAlt style={{ marginRight: "0.3rem" }} /> แบบฟอร์ม
        </NavLink>
        <NavLink
          to="/regulations"
          className={({ isActive }) =>
            isActive ? "nav-link active" : "nav-link"
          }
          onClick={closeMenu}
        >
          <FaBookOpen style={{ marginRight: "0.3rem" }} /> ระเบียบการลา
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/admin/leaves"
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
            onClick={closeMenu}
          >
            <FaClipboardList style={{ marginRight: "0.3rem" }} /> จัดการใบลา
          </NavLink>
        )}
        {isAdmin && (
          <div className={`nav-dropdown ${adminDropdownOpen ? 'open' : ''}`}>
            <span
              className="nav-link dropdown-toggle"
              onClick={toggleAdminDropdown}
            >
              <FaCog style={{ marginRight: "0.3rem" }} /> จัดการระบบ
            </span>
            <div className="dropdown-menu">
              <NavLink
                to="/reports"
                className="dropdown-item"
                onClick={closeMenu}
              >
                <FaChartBar style={{ marginRight: "0.3rem" }} /> รายงาน
              </NavLink>
              <NavLink
                to="/users"
                className="dropdown-item"
                onClick={closeMenu}
              >
                <FaUsersCog style={{ marginRight: "0.3rem" }} /> จัดการบุคลากร
              </NavLink>
              <NavLink
                to="/leave-types"
                className="dropdown-item"
                onClick={closeMenu}
              >
                <FaFileAlt style={{ marginRight: "0.3rem" }} /> ประเภทการลา
              </NavLink>
              <NavLink
                to="/holidays"
                className="dropdown-item"
                onClick={closeMenu}
              >
                <FaCalendarCheck style={{ marginRight: "0.3rem" }} /> วันหยุด
              </NavLink>
            </div>
          </div>
        )}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? "nav-link active mobile-profile-link" : "nav-link mobile-profile-link"
          }
          onClick={closeMenu}
        >
          <FaUser style={{ marginRight: "0.3rem" }} /> ข้อมูลส่วนตัว
        </NavLink>
      </div>

      <div className="navbar-end">
        <NotificationBell />
        <NavLink to="/profile" className="user-info-link" onClick={closeMenu}>
          <div className="user-info">
            <span className="user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="user-role">
              {user?.role === "admin"
                ? "ผู้ดูแลระบบ"
                : user?.role === "supervisor" || user?.role === "head"
                  ? "หัวหน้างาน"
                  : "บุคลากร"}
            </span>
          </div>
        </NavLink>
        <button onClick={handleLogout} className="logout-btn">
          <FaSignOutAlt style={{ marginRight: "0.3rem" }} />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
