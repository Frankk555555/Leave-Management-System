// ============================================
// Notification Model (Sequelize)
// ============================================

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      field: "user_id",
    },
    type: {
      type: DataTypes.ENUM(
        "leave_request",
        "approval",
        "rejection",
        "confirmation",
        "new_leave",
        "cancellation",
        "reminder"
      ),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    relatedLeaveId: {
      type: DataTypes.INTEGER.UNSIGNED,
      field: "related_leave_id",
      allowNull: true,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_read",
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "read_at",
      comment: "เวลาที่อ่าน notification",
    },
  },
  {
    tableName: "notifications",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_notifications_user_read_created",
        fields: ["user_id", "is_read", "created_at"],
      },
    ],
  }
);

module.exports = Notification;
