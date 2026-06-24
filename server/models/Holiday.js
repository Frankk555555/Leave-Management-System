// ============================================
// Holiday Model (Sequelize)
// ============================================

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Holiday = sequelize.define(
  "Holiday",
  {
    id: {
      type: DataTypes.SMALLINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      unique: true,
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "ปีของวันหยุด (สำหรับ filter)",
    },
    type: {
      type: DataTypes.ENUM("national", "special", "compensatory"),
      defaultValue: "national",
      comment: "national=วันหยุดราชการ, special=วันหยุดพิเศษ, compensatory=วันชดเชย",
    },
    isHalfDay: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "เป็นวันหยุดครึ่งวันหรือไม่",
    },
    description: {
      type: DataTypes.STRING(255),
    },
  },
  {
    tableName: "holidays",
    timestamps: true,
    underscored: true,
  }
);

module.exports = Holiday;
