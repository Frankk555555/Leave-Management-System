const {
  User,
  LeaveBalance,
  LeaveType,
  Department,
  LeaveRequest,
  LeaveHistory,
} = require("../models");
const { Op } = require("sequelize");
const { getFiscalYear } = require("../services/leaveValidationService");

/**
 * Helper: สร้าง LeaveBalance สำหรับ user ใหม่ (normalized)
 * สร้าง 1 row ต่อ 1 leave_type สำหรับปีปัจจุบัน
 */
const createLeaveBalancesForUser = async (userId) => {
  const leaveTypes = await LeaveType.findAll({ where: { isActive: true } });
  const currentYear = getFiscalYear();

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
  const currentYear = getFiscalYear();
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
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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
      const currentYear = getFiscalYear();
      for (const lb of leaveBalances) {
        if (lb.leaveTypeId) {
          const oldBalance = await LeaveBalance.findOne({
            where: { userId: user.id, leaveTypeId: lb.leaveTypeId, year: lb.year || currentYear },
          });
          const oldTotalDays = oldBalance ? oldBalance.totalDays : null;
          const oldUsedDays = oldBalance ? oldBalance.usedDays : null;

          await LeaveBalance.upsert({
            userId: user.id,
            leaveTypeId: lb.leaveTypeId,
            year: lb.year || currentYear,
            totalDays: lb.totalDays,
            usedDays: lb.usedDays || 0,
            carriedOverDays: lb.carriedOverDays || 0,
          });

          if (!oldBalance || oldTotalDays !== lb.totalDays || oldUsedDays !== (lb.usedDays || 0)) {
            await LeaveHistory.create({
              leaveRequestId: null,
              action: "admin_update_balance",
              actionBy: req.user.id,
              comment: `Admin modified balance for leave type ID ${lb.leaveTypeId}: Total ${oldTotalDays} -> ${lb.totalDays}, Used ${oldUsedDays} -> ${lb.usedDays || 0}`,
              oldStatus: null,
              newStatus: null,
            });
          }
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
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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

    // Find all leave requests belonging to the user to clean up related child records first
    const userLeaveRequests = await LeaveRequest.findAll({ where: { userId: user.id } });
    const leaveRequestIds = userLeaveRequests.map(req => req.id);

    // Delete related records (CASCADE handles most, but be explicit)
    await LeaveBalance.destroy({ where: { userId: user.id } });
    await Notification.destroy({ where: { userId: user.id } });
    
    // Destroy LeaveHistory and LeaveAttachment related to the user's leave requests (NOT the ones they approved)
    if (leaveRequestIds.length > 0) {
      await LeaveHistory.destroy({ where: { leaveRequestId: leaveRequestIds } });
      const { LeaveAttachment } = require("../models");
      await LeaveAttachment.destroy({ where: { leaveRequestId: leaveRequestIds } });
    }

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
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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
      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          message: "รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว",
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
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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

    // Use Cloudinary URL if available, otherwise use local path
    user.profileImage = req.file.path && req.file.path.startsWith("http") 
      ? req.file.path 
      : `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({
      message: "อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว",
      profileImage: user.profileImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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

    // Use Cloudinary URL if available, otherwise use local path
    user.signatureImage = req.file.path && req.file.path.startsWith("http") 
      ? req.file.path 
      : `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.json({
      message: "อัปเดตลายเซ็นต์เรียบร้อยแล้ว",
      signatureImage: user.signatureImage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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

    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      return res
        .status(400)
        .json({ message: "รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว" });
    }

    user.password = newPassword; // Will be hashed by beforeUpdate hook
    await user.save();

    res.json({ message: "รีเซ็ตรหัสผ่านเรียบร้อยแล้ว" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// Helper: ค้นหา Department ID จากค่าที่ส่งเข้ามา (ID, code, หรือ name)
const resolveDepartment = async (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const cleanValue = String(value).trim();
  
  // 1. ลองหาด้วย ID (ตัวเลข)
  const numericId = parseInt(cleanValue);
  if (!isNaN(numericId)) {
    const dept = await Department.findByPk(numericId);
    if (dept) return dept.id;
  }
  
  // 2. ลองหาด้วย Code หรือ Name (case-insensitive)
  const dept = await Department.findOne({
    where: {
      [Op.or]: [
        { code: cleanValue },
        { name: cleanValue }
      ]
    }
  });
  if (dept) return dept.id;
  
  return null;
};

// Helper: ค้นหา Supervisor ID จากค่าที่ส่งเข้ามา (ID, email, หรือ employeeId)
const resolveSupervisor = async (value) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const cleanValue = String(value).trim();

  // 1. ลองหาด้วย ID (ตัวเลข)
  const numericId = parseInt(cleanValue);
  if (!isNaN(numericId)) {
    const sup = await User.findByPk(numericId);
    if (sup) return sup.id;
  }

  // 2. ลองหาด้วย email หรือ employeeId
  const sup = await User.findOne({
    where: {
      [Op.or]: [
        { email: cleanValue },
        { employeeId: cleanValue }
      ]
    }
  });
  if (sup) return sup.id;

  return null;
};

// Helper: แปลงค่า Cell ของ ExcelJS เป็น String ที่สะอาด
const getCellValueString = (cell) => {
  if (!cell || cell.value === null || cell.value === undefined) return "";
  if (cell.value instanceof Date) {
    return cell.value.toISOString().split("T")[0];
  }
  if (typeof cell.value === "object") {
    if (cell.value.result !== undefined) {
      if (cell.value.result instanceof Date) return cell.value.result.toISOString().split("T")[0];
      return String(cell.value.result).trim();
    }
    if (cell.value.text !== undefined) return String(cell.value.text).trim();
    if (Array.isArray(cell.value.richText)) {
      return cell.value.richText.map(rt => rt.text || "").join("").trim();
    }
    return JSON.stringify(cell.value);
  }
  return String(cell.value).trim();
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

    // Required fields (excluding password, as it can be auto-generated)
    const requiredFields = [
      "employeeid",
      "firstname",
      "lastname",
      "email",
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

      // Skip empty rows
      const testEmpId = headers["employeeid"] ? getCellValueString(row.getCell(headers["employeeid"])) : "";
      const testEmail = headers["email"] ? getCellValueString(row.getCell(headers["email"])) : "";
      if (!testEmpId && !testEmail) {
        continue;
      }

      // Extract data from row using robust helper
      rowData.employeeId = getCellValueString(row.getCell(headers["employeeid"]));
      rowData.firstName = getCellValueString(row.getCell(headers["firstname"]));
      rowData.lastName = getCellValueString(row.getCell(headers["lastname"]));
      rowData.email = getCellValueString(row.getCell(headers["email"]));
      rowData.password = headers["password"] ? getCellValueString(row.getCell(headers["password"])) : "";
      rowData.position = getCellValueString(row.getCell(headers["position"]));
      
      rowData.role = headers["role"]
        ? getCellValueString(row.getCell(headers["role"])) || "employee"
        : "employee";

      rowData.phone = headers["phone"] ? getCellValueString(row.getCell(headers["phone"])) : null;
      rowData.startDate = headers["startdate"] ? getCellValueString(row.getCell(headers["startdate"])) : null;
      rowData.governmentDivision = headers["governmentdivision"] ? getCellValueString(row.getCell(headers["governmentdivision"])) : null;
      rowData.documentNumber = headers["documentnumber"] ? getCellValueString(row.getCell(headers["documentnumber"])) : null;
      rowData.unit = headers["unit"] ? getCellValueString(row.getCell(headers["unit"])) : null;
      rowData.affiliation = headers["affiliation"] ? getCellValueString(row.getCell(headers["affiliation"])) : null;

      // Smart Department & Supervisor resolution
      const rawDept = headers["departmentid"] ? row.getCell(headers["departmentid"])?.value : null;
      const rawSup = headers["supervisorid"] ? row.getCell(headers["supervisorid"])?.value : null;
      rowData.departmentId = await resolveDepartment(rawDept);
      rowData.supervisorId = await resolveSupervisor(rawSup);

      // Validate required fields
      const missingRowFields = [];
      if (!rowData.employeeId) missingRowFields.push("employeeId");
      if (!rowData.firstName) missingRowFields.push("firstName");
      if (!rowData.lastName) missingRowFields.push("lastName");
      if (!rowData.email) missingRowFields.push("email");
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

      // Check/Generate password
      let passwordToUse = rowData.password;
      let isPasswordGenerated = false;
      if (!passwordToUse) {
        const randomNum = Math.floor(100 + Math.random() * 900);
        passwordToUse = `Welcome@2026${randomNum}`;
        isPasswordGenerated = true;
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
          // Update details (upsert style)
          await existingUser.update({
            firstName: rowData.firstName,
            lastName: rowData.lastName,
            email: rowData.email,
            position: rowData.position,
            role: rowData.role,
            departmentId: rowData.departmentId || existingUser.departmentId,
            supervisorId: rowData.supervisorId || existingUser.supervisorId,
            phone: rowData.phone || existingUser.phone,
            startDate: rowData.startDate || existingUser.startDate,
            governmentDivision: rowData.governmentDivision || existingUser.governmentDivision,
            documentNumber: rowData.documentNumber || existingUser.documentNumber,
            unit: rowData.unit || existingUser.unit,
            affiliation: rowData.affiliation || existingUser.affiliation,
          });

          results.success.push({
            row: rowNumber,
            employeeId: rowData.employeeId,
            name: `${rowData.firstName} ${rowData.lastName}`,
            action: "updated",
          });
        } else {
          // Create user
          const user = await User.create({
            employeeId: rowData.employeeId,
            firstName: rowData.firstName,
            lastName: rowData.lastName,
            email: rowData.email,
            password: passwordToUse,
            position: rowData.position,
            role: rowData.role,
            departmentId: rowData.departmentId,
            supervisorId: rowData.supervisorId,
            phone: rowData.phone,
            startDate: rowData.startDate,
            governmentDivision: rowData.governmentDivision,
            documentNumber: rowData.documentNumber,
            unit: rowData.unit,
            affiliation: rowData.affiliation,
          });

          // Create leave balances (normalized)
          await createLeaveBalancesForUser(user.id);

          results.success.push({
            row: rowNumber,
            employeeId: rowData.employeeId,
            name: `${rowData.firstName} ${rowData.lastName}`,
            action: "created",
            tempPassword: isPasswordGenerated ? passwordToUse : null,
          });
        }
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
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// Generic user list synchronizer helper
const syncUsersList = async (rows, mapping) => {
  const results = {
    success: [],
    failed: [],
  };

  const { Op } = require("sequelize");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 1;
    const rowData = {};

    try {
      // Map columns based on mapping configuration
      rowData.employeeId = mapping.employeeId ? String(row[mapping.employeeId] || "").trim() : "";
      rowData.firstName = mapping.firstName ? String(row[mapping.firstName] || "").trim() : "";
      rowData.lastName = mapping.lastName ? String(row[mapping.lastName] || "").trim() : "";
      rowData.email = mapping.email ? String(row[mapping.email] || "").trim() : "";
      rowData.position = mapping.position ? String(row[mapping.position] || "").trim() : "";
      
      rowData.role = mapping.role ? String(row[mapping.role] || "").trim() : "employee";
      rowData.phone = mapping.phone ? String(row[mapping.phone] || "").trim() : null;
      
      // Handle Start Date formatting safely
      const rawStartDate = mapping.startDate ? row[mapping.startDate] : null;
      if (rawStartDate instanceof Date) {
        rowData.startDate = rawStartDate.toISOString().split("T")[0];
      } else if (rawStartDate) {
        rowData.startDate = String(rawStartDate).trim();
      } else {
        rowData.startDate = null;
      }

      rowData.governmentDivision = mapping.governmentDivision ? String(row[mapping.governmentDivision] || "").trim() : null;
      rowData.documentNumber = mapping.documentNumber ? String(row[mapping.documentNumber] || "").trim() : null;
      rowData.unit = mapping.unit ? String(row[mapping.unit] || "").trim() : null;
      rowData.affiliation = mapping.affiliation ? String(row[mapping.affiliation] || "").trim() : null;

      // Smart resolution
      const rawDept = mapping.departmentId ? row[mapping.departmentId] : null;
      const rawSup = mapping.supervisorId ? row[mapping.supervisorId] : null;
      rowData.departmentId = await resolveDepartment(rawDept);
      rowData.supervisorId = await resolveSupervisor(rawSup);

      // Validate required fields
      const missingRowFields = [];
      if (!rowData.employeeId) missingRowFields.push("employeeId");
      if (!rowData.firstName) missingRowFields.push("firstName");
      if (!rowData.lastName) missingRowFields.push("lastName");
      if (!rowData.email) missingRowFields.push("email");
      if (!rowData.position) missingRowFields.push("position");

      if (missingRowFields.length > 0) {
        results.failed.push({
          row: rowNumber,
          employeeId: rowData.employeeId || "-",
          reason: `ข้อมูลไม่ครบ: ${missingRowFields.join(", ")}`,
        });
        continue;
      }

      // Check/Validate role
      const validRoles = ["employee", "head", "admin"];
      if (!validRoles.includes(rowData.role)) {
        rowData.role = "employee";
      }

      // Resolve/Get password
      let passwordToUse = mapping.defaultPassword || "Welcome@2026";
      let isPasswordGenerated = false;
      const mappedPass = mapping.password ? String(row[mapping.password] || "").trim() : "";
      if (mappedPass) {
        passwordToUse = mappedPass;
      } else {
        // Auto-generate secure password if welcome default is not secure enough
        const randomNum = Math.floor(100 + Math.random() * 900);
        passwordToUse = `Welcome@2026${randomNum}`;
        isPasswordGenerated = true;
      }

      // Find if user already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { email: rowData.email },
            { employeeId: rowData.employeeId },
          ],
        },
      });

      if (existingUser) {
        // Update user details
        await existingUser.update({
          firstName: rowData.firstName,
          lastName: rowData.lastName,
          email: rowData.email,
          position: rowData.position,
          role: rowData.role,
          departmentId: rowData.departmentId || existingUser.departmentId,
          supervisorId: rowData.supervisorId || existingUser.supervisorId,
          phone: rowData.phone || existingUser.phone,
          startDate: rowData.startDate || existingUser.startDate,
          governmentDivision: rowData.governmentDivision || existingUser.governmentDivision,
          documentNumber: rowData.documentNumber || existingUser.documentNumber,
          unit: rowData.unit || existingUser.unit,
          affiliation: rowData.affiliation || existingUser.affiliation,
        });

        results.success.push({
          row: rowNumber,
          employeeId: rowData.employeeId,
          name: `${rowData.firstName} ${rowData.lastName}`,
          action: "updated",
        });
      } else {
        // Create user
        const user = await User.create({
          employeeId: rowData.employeeId,
          firstName: rowData.firstName,
          lastName: rowData.lastName,
          email: rowData.email,
          password: passwordToUse,
          position: rowData.position,
          role: rowData.role,
          departmentId: rowData.departmentId,
          supervisorId: rowData.supervisorId,
          phone: rowData.phone,
          startDate: rowData.startDate,
          governmentDivision: rowData.governmentDivision,
          documentNumber: rowData.documentNumber,
          unit: rowData.unit,
          affiliation: rowData.affiliation,
        });

        // Create leave balances
        await createLeaveBalancesForUser(user.id);

        results.success.push({
          row: rowNumber,
          employeeId: rowData.employeeId,
          name: `${rowData.firstName} ${rowData.lastName}`,
          action: "created",
          tempPassword: isPasswordGenerated ? passwordToUse : null,
        });
      }
    } catch (err) {
      results.failed.push({
        row: rowNumber,
        employeeId: rowData.employeeId || "-",
        reason: err.message,
      });
    }
  }

  return results;
};

// @desc    Preview database connection & select query columns
// @route   POST /api/users/import-db-preview
// @access  Private/Admin
const previewDbSync = async (req, res) => {
  try {
    const mysql = require("mysql2/promise");
    const { host, port, database, user, password, query } = req.body;
    if (!host || !database || !user || !query) {
      return res.status(400).json({ message: "กรุณาระบุข้อมูลเชื่อมต่อและคำสั่ง SQL ให้ครบถ้วน" });
    }

    const connection = await mysql.createConnection({
      host,
      port: parseInt(port) || 3306,
      database,
      user,
      password,
      connectTimeout: 5000,
    });

    const [rows] = await connection.execute(query);
    await connection.end();

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.json({ columns: [], preview: [], message: "เชื่อมต่อสำเร็จ แต่ไม่พบข้อมูลจากการค้นหา" });
    }

    const columns = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);

    res.json({
      message: "เชื่อมต่อฐานข้อมูลสำเร็จ",
      columns,
      preview,
    });
  } catch (error) {
    console.error("Database preview error:", error);
    res.status(500).json({ message: "ไม่สามารถเชื่อมต่อฐานข้อมูลได้", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Sync user data from database with field mapping
// @route   POST /api/users/import-db-sync
// @access  Private/Admin
const executeDbSync = async (req, res) => {
  try {
    const mysql = require("mysql2/promise");
    const { host, port, database, user, password, query, mapping } = req.body;
    if (!host || !database || !user || !query || !mapping) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    }

    const connection = await mysql.createConnection({
      host,
      port: parseInt(port) || 3306,
      database,
      user,
      password,
      connectTimeout: 5000,
    });

    const [rows] = await connection.execute(query);
    await connection.end();

    const results = await syncUsersList(rows, mapping);

    res.json({
      message: `ซิงค์ข้อมูลจากฐานข้อมูลเสร็จสิ้น: สำเร็จ ${results.success.length} รายการ, ล้มเหลว ${results.failed.length} รายการ`,
      results,
    });
  } catch (error) {
    console.error("Database sync error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการซิงค์ฐานข้อมูล", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Preview external API endpoint data
// @route   POST /api/users/import-api-preview
// @access  Private/Admin
const previewApiSync = async (req, res) => {
  try {
    const { url, headers } = req.body;
    if (!url) {
      return res.status(400).json({ message: "กรุณาระบุ URL ของ API" });
    }

    const fetchOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (headers) {
      try {
        const parsedHeaders = JSON.parse(headers);
        fetchOptions.headers = { ...fetchOptions.headers, ...parsedHeaders };
      } catch (e) {
        if (headers.includes(":")) {
          const [key, val] = headers.split(":");
          fetchOptions.headers[key.trim()] = val.trim();
        } else {
          fetchOptions.headers["Authorization"] = headers.trim();
        }
      }
    }

    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : null);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "ดึงข้อมูลสำเร็จ แต่รูปแบบข้อมูลไม่ใช่ Array ของบุคลากร" });
    }

    const columns = Object.keys(rows[0]);
    const preview = rows.slice(0, 5);

    res.json({
      message: "เชื่อมต่อ API สำเร็จ",
      columns,
      preview,
    });
  } catch (error) {
    console.error("API preview error:", error);
    res.status(500).json({ message: "ไม่สามารถเชื่อมต่อ API ได้", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Sync user data from API endpoint with field mapping
// @route   POST /api/users/import-api-sync
// @access  Private/Admin
const executeApiSync = async (req, res) => {
  try {
    const { url, headers, mapping } = req.body;
    if (!url || !mapping) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
    }

    const fetchOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (headers) {
      try {
        const parsedHeaders = JSON.parse(headers);
        fetchOptions.headers = { ...fetchOptions.headers, ...parsedHeaders };
      } catch (e) {
        if (headers.includes(":")) {
          const [key, val] = headers.split(":");
          fetchOptions.headers[key.trim()] = val.trim();
        } else {
          fetchOptions.headers["Authorization"] = headers.trim();
        }
      }
    }

    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : null);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "ดึงข้อมูลสำเร็จ แต่ไม่พบข้อมูลบุคลากร" });
    }

    const results = await syncUsersList(rows, mapping);

    res.json({
      message: `ซิงค์ข้อมูลจาก API เสร็จสิ้น: สำเร็จ ${results.success.length} รายการ, ล้มเหลว ${results.failed.length} รายการ`,
      results,
    });
  } catch (error) {
    console.error("API sync error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการซิงค์ API", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Mock university database staff directory API
// @route   GET /api/users/mock-university-api
// @access  Private/Admin
const getMockUniversityApi = async (req, res) => {
  const mockUsers = [
    {
      emp_id: "UNI001",
      name_first: "รศ.ดร.กิตติพงษ์",
      name_last: "เจริญสุข",
      email_address: "kittipong.c@bru.ac.th",
      position_title: "อาจารย์ประจำสาขาวิชาคณิตศาสตร์",
      job_role: "employee",
      phone_no: "0811223344",
      division_name: "คณะวิทยาศาสตร์",
      dept_name: "สาขาวิชาคณิตศาสตร์",
      start_date: "2019-03-01",
    },
    {
      emp_id: "UNI002",
      name_first: "ดร.วรรณภา",
      name_last: "ศรีสวัสดิ์",
      email_address: "wannapa.s@bru.ac.th",
      position_title: "อาจารย์ประจำสาขาวิชาเทคโนโลยีสารสนเทศ",
      job_role: "employee",
      phone_no: "0899887766",
      division_name: "คณะวิทยาศาสตร์",
      dept_name: "สาขาวิชาเทคโนโลยีสารสนเทศ",
      start_date: "2021-08-15",
    },
    {
      emp_id: "UNI003",
      name_first: "ผศ.มานพ",
      name_last: "ยอดดี",
      email_address: "manop.y@bru.ac.th",
      position_title: "หัวหน้าภาควิชาคณิตศาสตร์",
      job_role: "head",
      phone_no: "0855443322",
      division_name: "คณะวิทยาศาสตร์",
      dept_name: "สาขาวิชาคณิตศาสตร์",
      start_date: "2015-05-10",
    },
    {
      emp_id: "UNI004",
      name_first: "นางสาวศิริลักษณ์",
      name_last: "ใจงาม",
      email_address: "sirilak.j@bru.ac.th",
      position_title: "เจ้าหน้าที่บริหารงานทั่วไป",
      job_role: "employee",
      phone_no: "0877665544",
      division_name: "สำนักงานอธิการบดี",
      dept_name: "สำนักงานอธิการบดี",
      start_date: "2022-01-10",
    },
    {
      emp_id: "UNI005",
      name_first: "ดร.ณรงค์",
      name_last: "แก้วสะอาด",
      email_address: "narong.k@bru.ac.th",
      position_title: "อาจารย์ประจำสาขาวิชาเคมี",
      job_role: "employee",
      phone_no: "0866554433",
      division_name: "คณะวิทยาศาสตร์",
      dept_name: "สาขาวิชาเคมี",
      start_date: "2020-11-01",
    }
  ];
  res.json(mockUsers);
};

// @desc    Setup & Seed mock_university_personnel table in local DB for testing sync
// @route   POST /api/users/setup-mock-db
// @access  Private/Admin
const setupMockDb = async (req, res) => {
  try {
    const { QueryTypes } = require("sequelize");
    const { sequelize } = require("../config/database");

    // Create table if not exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS mock_university_personnel (
        id INT AUTO_INCREMENT PRIMARY KEY,
        emp_id VARCHAR(20) UNIQUE NOT NULL,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(80) UNIQUE NOT NULL,
        position_title VARCHAR(80),
        role_name VARCHAR(20) DEFAULT 'employee',
        phone_no VARCHAR(15),
        dept_name VARCHAR(100),
        faculty_name VARCHAR(100),
        start_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Check count
    const countResult = await sequelize.query(
      "SELECT COUNT(*) as count FROM mock_university_personnel",
      { type: QueryTypes.SELECT }
    );
    const count = countResult[0].count;

    if (count === 0) {
      const mockUsers = [
        ["UNI001", "รศ.ดร.กิตติพงษ์", "เจริญสุข", "kittipong.c@bru.ac.th", "อาจารย์ประจำสาขาวิชาวิทยาการคอมพิวเตอร์", "employee", "0811223344", "สาขาวิชาวิทยาการคอมพิวเตอร์", "คณะวิทยาศาสตร์", "2019-03-01"],
        ["UNI002", "ดร.วรรณภา", "ศรีสวัสดิ์", "wannapa.s@bru.ac.th", "อาจารย์ประจำสาขาวิชาเทคโนโลยีสารสนเทศ", "employee", "0899887766", "สาขาวิชาเทคโนโลยีสารสนเทศ", "คณะวิทยาศาสตร์", "2021-08-15"],
        ["UNI003", "ผศ.มานพ", "ยอดดี", "manop.y@bru.ac.th", "หัวหน้าภาควิชาคณิตศาสตร์", "head", "0855443322", "สาขาวิชาคณิตศาสตร์", "คณะวิทยาศาสตร์", "2015-05-10"],
        ["UNI004", "นางสาวศิริลักษณ์", "ใจงาม", "sirilak.j@bru.ac.th", "เจ้าหน้าที่บริหารงานทั่วไป", "employee", "0877665544", "สำนักงานอธิการบดี", "สำนักงานอธิการบดี", "2022-01-10"],
        ["UNI005", "ดร.ณรงค์", "แก้วสะอาด", "narong.k@bru.ac.th", "อาจารย์ประจำสาขาวิชาเคมี", "employee", "0866554433", "สาขาวิชาเคมี", "คณะวิทยาศาสตร์", "2020-11-01"]
      ];

      for (const user of mockUsers) {
        await sequelize.query(
          `INSERT INTO mock_university_personnel 
          (emp_id, first_name, last_name, email, position_title, role_name, phone_no, dept_name, faculty_name, start_date) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          { replacements: user }
        );
      }
    }

    res.json({ message: "ตั้งค่าตารางจำลอง mock_university_personnel เรียบร้อยแล้ว พร้อมข้อมูลบุคลากร 5 รายการ" });
  } catch (error) {
    console.error("Setup mock DB error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการตั้งค่าตารางจำลอง", error: process.env.NODE_ENV === "development" ? error.message : undefined });
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
  previewDbSync,
  executeDbSync,
  previewApiSync,
  executeApiSync,
  getMockUniversityApi,
  setupMockDb,
};
