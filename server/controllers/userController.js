const {
  User,
  LeaveBalance,
  LeaveType,
  Department,
  LeaveRequest,
  LeaveHistory,
  Notification,
} = require("../models");
const { Op } = require("sequelize");

/**
 * Helper: สร้าง LeaveBalance สำหรับ user ใหม่ (normalized)
 * สร้าง 1 row ต่อ 1 leave_type สำหรับปีปัจจุบัน
 */
const createLeaveBalancesForUser = async (userId) => {
  const leaveTypes = await LeaveType.findAll({ where: { isActive: true } });
  const currentYear = new Date().getFullYear();

  await Promise.all(
    leaveTypes.map((lt) =>
      LeaveBalance.findOrCreate({
        where: { userId, leaveTypeId: lt.id, year: currentYear },
        defaults: {
          totalDays: lt.defaultDays,
          usedDays: 0,
          carriedOverDays: 0,
        },
      })
    )
  );
};

/**
 * Helper: สร้าง include สำหรับ leaveBalances (ปีปัจจุบัน + LeaveType)
 */
const getLeaveBalancesInclude = () => {
  const currentYear = new Date().getFullYear();
  return {
    model: LeaveBalance,
    as: "leaveBalances",
    where: { year: currentYear },
    required: false,
    include: [
      {
        model: LeaveType,
        as: "leaveType",
        attributes: ["id", "name", "code", "defaultDays"],
      },
    ],
  };
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ["password"] },
      include: [
        {
          model: User,
          as: "supervisor",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        getLeaveBalancesInclude(),
        {
          model: Department,
          as: "department",
        },
      ],
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: User,
          as: "supervisor",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        getLeaveBalancesInclude(),
        {
          model: Department,
          as: "department",
        },
      ],
    });

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      password,
      departmentId,
      position,
      role,
      supervisorId,
      governmentDivision,
      documentNumber,
      unit,
      affiliation,
    } = req.body;

    // Handle empty strings for optional fields
    const safeDepartmentId = departmentId === "" ? null : departmentId;
    const safeSupervisorId = supervisorId === "" ? null : supervisorId;

    // Check if user exists
    const userExists = await User.findOne({
      where: {
        [Op.or]: [{ email }, { employeeId }],
      },
    });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user
    const user = await User.create({
      employeeId,
      firstName,
      lastName,
      email,
      password, // Will be hashed by hook
      departmentId: safeDepartmentId,
      position,
      role: role || "employee",
      supervisorId: safeSupervisorId,
      governmentDivision,
      documentNumber,
      unit,
      affiliation,
    });

    // Create leave balances (normalized: 1 row per leave_type)
    await createLeaveBalancesForUser(user.id);

    // Fetch user with associations
    const userWithBalance = await User.findByPk(user.id, {
      include: [getLeaveBalancesInclude(), { model: Department, as: "department" }],
    });

    res.status(201).json({
      id: user.id,
      employeeId: user.employeeId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: userWithBalance.department,
      position: user.position,
      role: user.role,
      leaveBalances: userWithBalance.leaveBalances,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [getLeaveBalancesInclude()],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const {
      firstName,
      lastName,
      email,
      departmentId,
      position,
      role,
      supervisorId,
      startDate,
      governmentDivision,
      documentNumber,
      unit,
      affiliation,
      leaveBalances,
    } = req.body;

    // Handle empty strings for optional fields
    const safeDepartmentId = departmentId === "" ? null : departmentId;
    const safeSupervisorId = supervisorId === "" ? null : supervisorId;
    const safeStartDate = startDate === "" ? null : startDate;

    // Update user fields
    await user.update({
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
      email: email || user.email,
      departmentId:
        safeDepartmentId !== undefined ? safeDepartmentId : user.departmentId,
      position: position || user.position,
      role: role || user.role,
      supervisorId:
        safeSupervisorId !== undefined ? safeSupervisorId : user.supervisorId,
      startDate: safeStartDate !== undefined ? safeStartDate : user.startDate,
      governmentDivision:
        governmentDivision !== undefined
          ? governmentDivision
          : user.governmentDivision,
      documentNumber:
        documentNumber !== undefined ? documentNumber : user.documentNumber,
      unit: unit !== undefined ? unit : user.unit,
      affiliation: affiliation !== undefined ? affiliation : user.affiliation,
    });

    // Update leave balances if provided (normalized)
    if (leaveBalances && Array.isArray(leaveBalances)) {
      const currentYear = new Date().getFullYear();
      for (const lb of leaveBalances) {
        if (lb.leaveTypeId) {
          await LeaveBalance.upsert({
            userId: user.id,
            leaveTypeId: lb.leaveTypeId,
            year: lb.year || currentYear,
            totalDays: lb.totalDays,
            usedDays: lb.usedDays || 0,
            carriedOverDays: lb.carriedOverDays || 0,
          });
        }
      }
    }

    // Fetch updated user with associations
    const updatedUser = await User.findByPk(user.id, {
      include: [getLeaveBalancesInclude(), { model: Department, as: "department" }],
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Clear approved_by / confirmed_by references
    await LeaveRequest.update(
      { approvedBy: null },
      { where: { approvedBy: user.id } }
    );
    await LeaveRequest.update(
      { confirmedBy: null },
      { where: { confirmedBy: user.id } }
    );

    // Delete related records (CASCADE handles most, but be explicit)
    await LeaveBalance.destroy({ where: { userId: user.id } });
    await Notification.destroy({ where: { userId: user.id } });
    await LeaveHistory.destroy({ where: { actionBy: user.id } });
    await LeaveRequest.destroy({ where: { userId: user.id } });

    // Update supervisor references
    await User.update(
      { supervisorId: null },
      { where: { supervisorId: user.id } }
    );

    await user.destroy();
    res.json({ message: "User removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get supervisors
// @route   GET /api/users/supervisors
// @access  Private
const getSupervisors = async (req, res) => {
  try {
    const supervisors = await User.findAll({
      where: {
        role: { [Op.in]: ["head", "admin"] },
        isActive: true,
      },
      attributes: [
        "id",
        "employeeId",
        "firstName",
        "lastName",
        "email",
        "departmentId",
      ],
      include: [{ model: Department, as: "department" }],
    });
    res.json(supervisors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update own profile (for regular users)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      governmentDivision,
      documentNumber,
      departmentId,
      unit,
      affiliation,
    } = req.body;

    // Update allowed fields only
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (departmentId !== undefined && departmentId !== "")
      user.departmentId = departmentId;
    if (governmentDivision !== undefined)
      user.governmentDivision = governmentDivision;
    if (documentNumber !== undefined) user.documentNumber = documentNumber;
    if (unit !== undefined) user.unit = unit;
    if (affiliation !== undefined) user.affiliation = affiliation;

    // Password validation
    if (password && password.trim() !== "") {
      if (password.length < 8) {
        return res
          .status(400)
          .json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
      }
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: "รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข",
        });
      }
      user.password = password; // Will be hashed by beforeUpdate hook
    }

    await user.save();

    // Return user without password
    const updatedUser = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [
        getLeaveBalancesInclude(),
        { model: Department, as: "department" },
      ],
    });

    res.json({ message: "อัปเดตโปรไฟล์เรียบร้อยแล้ว", user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update profile image
// @route   PUT /api/users/profile/image
// @access  Private
const updateProfileImage = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "กรุณาอัปโหลดรูปภาพ" });
    }

    user.profileImage = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({
      message: "อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว",
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Update signature image
// @route   PUT /api/users/profile/signature
// @access  Private
const updateSignatureImage = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "กรุณาอัปโหลดรูปลงนาม (ลายเซ็นต์)" });
    }

    user.signatureImage = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({
      message: "อัปเดตลายเซ็นต์เรียบร้อยแล้ว",
      signatureImage: user.signatureImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset user password (Admin only)
// @route   PUT /api/users/:id/reset-password
// @access  Private/Admin
const resetUserPassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "ไม่พบผู้ใช้" });
    }

    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim() === "") {
      return res.status(400).json({ message: "กรุณากรอกรหัสผ่านใหม่" });
    }

    // Enhanced password validation
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      return res
        .status(400)
        .json({ message: "รหัสผ่านต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ และตัวเลข" });
    }

    user.password = newPassword; // Will be hashed by beforeUpdate hook
    await user.save();

    res.json({ message: "รีเซ็ตรหัสผ่านเรียบร้อยแล้ว" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Import users from CSV/Excel file
// @route   POST /api/users/import
// @access  Private/Admin
const importUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "กรุณาอัปโหลดไฟล์" });
    }

    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split(".").pop().toLowerCase();

    // Read file based on extension
    if (fileExtension === "csv") {
      await workbook.csv.readFile(filePath, {
        parserOptions: {
          encoding: "utf8",
        },
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      await workbook.xlsx.readFile(filePath);
    } else {
      return res
        .status(400)
        .json({ message: "รองรับเฉพาะไฟล์ .csv, .xlsx, .xls" });
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ message: "ไม่พบข้อมูลในไฟล์" });
    }

    const results = {
      success: [],
      failed: [],
    };

    // Get header row
    const headerRow = worksheet.getRow(1);
    const headers = {};
    headerRow.eachCell((cell, colNumber) => {
      const value = cell.value?.toString().toLowerCase().trim();
      headers[value] = colNumber;
    });

    // Required fields
    const requiredFields = [
      "employeeid",
      "firstname",
      "lastname",
      "email",
      "password",
      "position",
    ];
    const missingFields = requiredFields.filter((f) => !headers[f]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `ไม่พบคอลัมน์ที่จำเป็น: ${missingFields.join(", ")}`,
      });
    }

    // Process each row (skip header)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      const rowData = {};

      // Extract data from row
      rowData.employeeId = row
        .getCell(headers["employeeid"])
        ?.value?.toString()
        .trim();
      rowData.firstName = row
        .getCell(headers["firstname"])
        ?.value?.toString()
        .trim();
      rowData.lastName = row
        .getCell(headers["lastname"])
        ?.value?.toString()
        .trim();
      rowData.email = row.getCell(headers["email"])?.value?.toString().trim();
      rowData.password = row
        .getCell(headers["password"])
        ?.value?.toString()
        .trim();
      rowData.position = row
        .getCell(headers["position"])
        ?.value?.toString()
        .trim();
      rowData.role = headers["role"]
        ? row.getCell(headers["role"])?.value?.toString().trim() || "employee"
        : "employee";
      rowData.departmentId = headers["departmentid"]
        ? row.getCell(headers["departmentid"])?.value || null
        : null;
      rowData.supervisorId = headers["supervisorid"]
        ? row.getCell(headers["supervisorid"])?.value || null
        : null;

      // Skip empty rows
      if (!rowData.employeeId && !rowData.email) {
        continue;
      }

      // Validate required fields
      const missingRowFields = [];
      if (!rowData.employeeId) missingRowFields.push("employeeId");
      if (!rowData.firstName) missingRowFields.push("firstName");
      if (!rowData.lastName) missingRowFields.push("lastName");
      if (!rowData.email) missingRowFields.push("email");
      if (!rowData.password) missingRowFields.push("password");
      if (!rowData.position) missingRowFields.push("position");

      if (missingRowFields.length > 0) {
        results.failed.push({
          row: rowNumber,
          employeeId: rowData.employeeId || "-",
          reason: `ข้อมูลไม่ครบ: ${missingRowFields.join(", ")}`,
        });
        continue;
      }

      // Validate role
      const validRoles = ["employee", "head", "admin"];
      if (!validRoles.includes(rowData.role)) {
        rowData.role = "employee";
      }

      try {
        // Check if user already exists
        const existingUser = await User.findOne({
          where: {
            [Op.or]: [
              { email: rowData.email },
              { employeeId: rowData.employeeId },
            ],
          },
        });

        if (existingUser) {
          results.failed.push({
            row: rowNumber,
            employeeId: rowData.employeeId,
            reason: "มีผู้ใช้นี้ในระบบแล้ว (email หรือ employeeId ซ้ำ)",
          });
          continue;
        }

        // Create user
        const user = await User.create({
          employeeId: rowData.employeeId,
          firstName: rowData.firstName,
          lastName: rowData.lastName,
          email: rowData.email,
          password: rowData.password,
          position: rowData.position,
          role: rowData.role,
          departmentId: rowData.departmentId || null,
          supervisorId: rowData.supervisorId || null,
        });

        // Create leave balances (normalized)
        await createLeaveBalancesForUser(user.id);

        results.success.push({
          row: rowNumber,
          employeeId: rowData.employeeId,
          name: `${rowData.firstName} ${rowData.lastName}`,
        });
      } catch (error) {
        results.failed.push({
          row: rowNumber,
          employeeId: rowData.employeeId,
          reason: error.message,
        });
      }
    }

    // Delete uploaded file
    const fs = require("fs");
    fs.unlinkSync(filePath);

    res.json({
      message: `นำเข้าข้อมูลเสร็จสิ้น: สำเร็จ ${results.success.length} รายการ, ล้มเหลว ${results.failed.length} รายการ`,
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getSupervisors,
  updateProfile,
  updateProfileImage,
  updateSignatureImage,
  resetUserPassword,
  importUsers,
};
