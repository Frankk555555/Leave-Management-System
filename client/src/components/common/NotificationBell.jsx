import React, { useState, useEffect, useRef } from "react";
import { notificationsAPI } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./NotificationBell.css";

const NotificationBell = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Listen for custom event to refresh notifications after actions
    const handleRefresh = () => {
      fetchNotifications();
      fetchUnreadCount();
    };
    window.addEventListener("refreshNotifications", handleRefresh);

    return () => window.removeEventListener("refreshNotifications", handleRefresh);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.notifications || response.data);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n.id || n._id) === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await handleMarkAsRead(notification.id || notification._id);
    }
    setIsOpen(false);

    // Navigate logic
    if (notification.type === "new_leave" || notification.type === "leave_request") {
      if (isAdmin) {
        navigate("/admin/leaves");
      } else {
        navigate("/approvals");
      }
    } else if (
      notification.type === "approval" ||
      notification.type === "rejection" ||
      notification.type === "confirmation"
    ) {
      navigate("/leave-history");
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "new_leave":
      case "leave_request":
        return "📝";
      case "approval":
      case "confirmation":
        return "✅";
      case "rejection":
        return "❌";
      default:
        return "🔔";
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return "เมื่อสักครู่";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} นาทีที่แล้ว`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
    return d.toLocaleDateString("th-TH");
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="bell-button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span className="badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>การแจ้งเตือน</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="mark-all-btn">
                อ่านทั้งหมด
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <p className="no-notifications">ไม่มีการแจ้งเตือน</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id || notification._id}
                  className={`notification-item ${
                    !notification.isRead ? "unread" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <span className="notification-icon">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">
                      {notification.message}
                    </p>
                    <span className="notification-time">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
