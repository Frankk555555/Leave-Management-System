// ============================================
// User Model (Sequelize)
// ============================================

const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");
const bcrypt = require("bcryptjs");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    employeeId: {
      type: DataTypes.STRING(20),
      unique: true,
      allowNull: false,
      field: "employee_id",
    },
    email: {
      type: DataTypes.STRING(80),
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.CHAR(60),
      allowNull: false,
      comment: "bcrypt hash คงที่ 60 chars",
    },
    firstName: {
      type: DataTypes.STRING(50),
      field: "first_name",
    },
    lastName: {
      type: DataTypes.STRING(50),
      field: "last_name",
    },
    departmentId: {
      type: DataTypes.SMALLINT.UNSIGNED,
      field: "department_id",
    },
    position: {
      type: DataTypes.STRING(80),
    },
    role: {
      type: DataTypes.ENUM("employee", "head", "admin"),
      defaultValue: "employee",
    },
    supervisorId: {
      type: DataTypes.INTEGER.UNSIGNED,
      field: "supervisor_id",
    },
    phone: {
      type: DataTypes.STRING(15),
      allowNull: true,
    },
    profileImage: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "profile_image",
      comment: "Path to profile image file",
    },
    signatureImage: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: "signature_image",
      comment: "Path to signature image file",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: "start_date",
      comment: "วันที่เริ่มรับราชการ (เพื่อคำนวณอายุราชการ)",
    },
    governmentDivision: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "government_division",
      comment: "ส่วนราชการ",
    },
    documentNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "document_number",
      comment: "ที่ (เลขหนังสือ เช่น อว 0624.2/)",
    },
    unit: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "unit",
      comment: "หน่วยงาน",
    },
    affiliation: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: "affiliation",
      comment: "สังกัด (คณะ)",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
      comment: "Soft delete flag",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
  }
);

// Instance method to compare password
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
User.prototype.toJSON = function () {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;
