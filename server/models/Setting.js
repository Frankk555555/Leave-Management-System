// ============================================
// Setting Model (Sequelize) - ค่าตั้งค่าระบบแบบ key/value
// ============================================

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Setting = sequelize.define(
  "Setting",
  {
    key: {
      type: DataTypes.STRING(64),
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "settings",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Setting;
