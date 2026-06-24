const { Notification, LeaveRequest, LeaveType, User } = require("../models");
const { Op } = require("sequelize");

// @desc    Get my notifications
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    // Auto-cleanup: Delete read notifications older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await Notification.destroy({
      where: {
        userId: req.user.id,
        isRead: true, // Only delete read notifications
        createdAt: {
          [Op.lt]: thirtyDaysAgo,
        },
      },
    });

    const { count, rows } = await Notification.findAndCountAll({
      where: { userId: req.user.id },
      include: [
        {
          model: LeaveRequest,
          as: "relatedLeave",
          attributes: ["id", "leaveTypeId", "startDate", "endDate", "status"],
          include: [
            {
              model: LeaveType,
              as: "leaveType",
              attributes: ["id", "name", "code"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });
    
    res.json({
      notifications: rows,
      totalCount: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({
      where: {
        userId: req.user.id,
        isRead: false,
      },
    });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await notification.update({ isRead: true, readAt: new Date() });

    res.json(notification);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { isRead: true, readAt: new Date() },
      {
        where: {
          userId: req.user.id,
          isRead: false,
        },
      }
    );
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await notification.destroy();
    res.json({ message: "Notification removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
