const {
  LeaveRequest,
  User,
  LeaveType,
  Department,
  Faculty,
} = require("../models");
const { Op } = require("sequelize");
const { getFiscalYear } = require("../services/leaveValidationService");
const { ReportExportService } = require("../services/reportExportService");

/**
 * Build the common date-range/timeSlot/userId/department/faculty/personnelType
 * filters shared by getLeaveStatistics, exportToExcel and exportToPDF.
 * Each caller's exact current filtering behaviour is preserved via `mode`.
 */
const buildReportFilters = (query, mode) => {
  const {
    year,
    month,
    timeSlot,
    userId,
    facultyId,
    departmentId,
    personnelType,
    startDate: qStartDate,
    endDate: qEndDate,
  } = query;

  const where = {};
  let currentYear = year;

  if (mode === "statistics") {
    currentYear = year || getFiscalYear();
    let startDate, endDate;

    if (qStartDate && qEndDate) {
      startDate = new Date(qStartDate);
      endDate = new Date(qEndDate);
      endDate.setHours(23, 59, 59, 999);
      currentYear = getFiscalYear(startDate);
    } else if (year && month) {
      startDate = new Date(year, parseInt(month, 10) - 1, 1);
      endDate = new Date(year, parseInt(month, 10), 0, 23, 59, 59);
      currentYear = year;
    } else {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    }

    where.startDate = { [Op.between]: [startDate, endDate] };
  } else {
    // export mode (exportToExcel / exportToPDF)
    if (qStartDate && qEndDate) {
      const start = new Date(qStartDate);
      const end = new Date(qEndDate);
      end.setHours(23, 59, 59, 999);
      where.startDate = { [Op.between]: [start, end] };
    } else if (year && month) {
      const startDate = new Date(year, parseInt(month, 10) - 1, 1);
      const endDate = new Date(year, parseInt(month, 10), 0, 23, 59, 59);
      where.startDate = { [Op.between]: [startDate, endDate] };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      where.startDate = { [Op.between]: [startDate, endDate] };
    }
  }

  if (timeSlot && timeSlot !== "all") {
    where.timeSlot = timeSlot;
  }

  if (userId) {
    where.userId = userId;
  }

  const userWhere = {};
  let userRequired = false;
  if (departmentId) {
    userWhere.departmentId = departmentId;
    userRequired = true;
  }

  if (personnelType && personnelType !== "all") {
    userWhere.personnelType = personnelType;
    userRequired = true;
  }

  const deptWhere = {};
  let deptRequired = false;
  if (facultyId) {
    deptWhere.facultyId = facultyId;
    deptRequired = true;
    userRequired = true;
  }

  return {
    where,
    userWhere,
    userRequired,
    deptWhere,
    deptRequired,
    currentYear,
  };
};

// @desc    Get leave statistics
// @route   GET /api/reports/statistics
// @access  Private/Admin
const getLeaveStatistics = async (req, res) => {
  try {
    const { userId, facultyId, departmentId } = req.query;

    const {
      where,
      userWhere,
      userRequired,
      deptWhere,
      deptRequired,
      currentYear,
    } = buildReportFilters(req.query, "statistics");

    // Get all leave requests for the range with LeaveType
    const leaveRequests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "departmentId"],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          required: userRequired ? true : undefined,
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name", "facultyId"],
              where: Object.keys(deptWhere).length > 0 ? deptWhere : undefined,
              required: deptRequired ? true : undefined,
            },
          ],
        },
        {
          model: LeaveType,
          as: "leaveType",
          attributes: ["id", "name", "code"],
        },
      ],
    });

    // Single pass over all requests to compute byStatus, byType, byDepartment,
    // byMonth and totalDays together (same results as the previous multi-pass
    // reduce/forEach implementation, just fewer iterations).
    const byType = {};
    const byDepartment = {};
    const byMonth = Array(12).fill(0);
    const byStatus = {};
    let totalDays = 0;

    for (const reqItem of leaveRequests) {
      byStatus[reqItem.status] = (byStatus[reqItem.status] || 0) + 1;

      const isValid =
        reqItem.status === "approved" || reqItem.status === "confirmed";
      if (!isValid) continue;

      const days = parseFloat(reqItem.totalDays || 0);
      totalDays += days;

      const typeCode = reqItem.leaveType?.code || "unknown";
      byType[typeCode] = (byType[typeCode] || 0) + days;

      const dept = reqItem.user?.department?.name || "ไม่ระบุ";
      byDepartment[dept] = (byDepartment[dept] || 0) + days;

      const m = new Date(reqItem.startDate).getMonth();
      byMonth[m] += days;
    }

    // Total employees matching the filter
    let totalEmployeesWhere = { isActive: true };
    let totalEmployeesInclude = undefined;

    if (userId) {
      totalEmployeesWhere.id = userId;
    } else if (departmentId) {
      totalEmployeesWhere.departmentId = departmentId;
    } else if (facultyId) {
      totalEmployeesInclude = [
        {
          model: Department,
          as: "department",
          where: { facultyId },
          required: true,
        },
      ];
    }

    const totalEmployees = await User.count({
      where: totalEmployeesWhere,
      include: totalEmployeesInclude,
    });

    res.json({
      year: currentYear,
      totalRequests: leaveRequests.length,
      totalDays,
      totalEmployees,
      byType,
      byDepartment,
      byMonth,
      byStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Export leave report to Excel
// @route   GET /api/reports/export/excel
// @access  Private/Admin
const exportToExcel = async (req, res) => {
  try {
    const {
      year,
      month,
      userId,
      facultyId,
      departmentId,
      personnelType,
      timeSlot,
      startDate: qStartDate,
      endDate: qEndDate,
    } = req.query;

    let selectedPersonName = "ทั้งหมด";
    let selectedFacultyName = "ทั้งหมด";
    let selectedDeptName = "ทั้งหมด";

    if (userId) {
      const user = await User.findByPk(userId);
      if (user) {
        selectedPersonName = `${user.firstName} ${user.lastName}`;
      }
    }
    if (facultyId) {
      const faculty = await Faculty.findByPk(facultyId);
      if (faculty) {
        selectedFacultyName = faculty.name;
      }
    }
    if (departmentId) {
      const dept = await Department.findByPk(departmentId);
      if (dept) {
        selectedDeptName = dept.name;
      }
    }

    const { where, userWhere, userRequired, deptWhere, deptRequired } =
      buildReportFilters(req.query, "export");

    const leaveRequests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "employeeId",
            "firstName",
            "lastName",
            "position",
            "departmentId",
          ],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          required: userRequired ? true : undefined,
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["name", "facultyId"],
              where: Object.keys(deptWhere).length > 0 ? deptWhere : undefined,
              required: deptRequired ? true : undefined,
            },
          ],
        },
        {
          model: User,
          as: "approver",
          attributes: ["firstName", "lastName"],
        },
        {
          model: LeaveType,
          as: "leaveType",
          attributes: ["name", "code"],
        },
      ],
      order: [["startDate", "DESC"]],
    });

    await ReportExportService.exportExcel({
      leaveRequests,
      queryParams: {
        year,
        month,
        departmentId,
        qStartDate,
        qEndDate,
      },
      meta: {
        selectedPersonName,
        selectedFacultyName,
        selectedDeptName,
      },
      res,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Export leave report to PDF (OPR-HR-034 format)
// @route   GET /api/reports/export/pdf
// @access  Private/Admin
const exportToPDF = async (req, res) => {
  try {
    const {
      year,
      month,
      userId,
      facultyId,
      departmentId,
      personnelType,
      timeSlot,
      startTime,
      endTime,
      startDate: qStartDate,
      endDate: qEndDate,
    } = req.query;

    const { where, userWhere, userRequired, deptWhere, deptRequired } =
      buildReportFilters(req.query, "export");

    // Query Leave Requests
    const leaveRequests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "employeeId",
            "firstName",
            "lastName",
            "position",
            "departmentId",
            "affiliation",
          ],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          required: userRequired ? true : undefined,
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["name", "facultyId"],
              where: Object.keys(deptWhere).length > 0 ? deptWhere : undefined,
              required: deptRequired ? true : undefined,
            },
          ],
        },
        {
          model: LeaveType,
          as: "leaveType",
          attributes: ["name", "code"],
        },
      ],
      order: [["startDate", "ASC"]],
    });

    // Build User Groups for the report
    let userGroups = [];

    if (userId) {
      let targetUser = await User.findByPk(userId, {
        attributes: [
          "id",
          "employeeId",
          "firstName",
          "lastName",
          "position",
          "departmentId",
          "affiliation",
        ],
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["name", "facultyId"],
          },
        ],
      });
      if (targetUser) {
        userGroups.push({
          user: targetUser,
          requests: leaveRequests,
        });
      }
    } else if (leaveRequests.length > 0) {
      const groupedMap = new Map();
      leaveRequests.forEach((reqItem) => {
        if (!reqItem.user) return;
        const uId = reqItem.user.id;
        if (!groupedMap.has(uId)) {
          groupedMap.set(uId, {
            user: reqItem.user,
            requests: [],
          });
        }
        groupedMap.get(uId).requests.push(reqItem);
      });
      userGroups = Array.from(groupedMap.values());
    } else {
      userGroups.push({
        user: req.user || {
          firstName: "บุคลากร",
          lastName: "",
          position: "บุคลากร",
          department: { name: "กองการบริหารงานบุคคล" },
        },
        requests: [],
      });
    }

    await ReportExportService.exportPDF({
      userGroups,
      queryParams: {
        year,
        month,
        timeSlot,
        startTime,
        endTime,
        startDate: qStartDate,
        endDate: qEndDate,
      },
      actor: req.user,
      res,
    });
  } catch (error) {
    console.error("Error exporting leave report to PDF:", error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Reset yearly leave balance for all employees (รีเซ็ตวันลาประจำปีงบประมาณ 1 ต.ค.)
// @route   POST /api/reports/reset-yearly
// @access  Private/Admin
const resetYearlyLeaveBalance = async (req, res) => {
  try {
    const {
      calculateAndCreateFiscalYearBalances,
    } = require("../services/leaveBalanceService");
    const targetYear = req.body?.year || req.query?.year;
    const result = await calculateAndCreateFiscalYearBalances({
      targetYear,
      triggeredBy: "manual",
    });

    res.json({
      message: "คำนวณและรีเซ็ตยอดวันลาประจำปีงบประมาณเรียบร้อยแล้ว",
      data: result,
    });
  } catch (error) {
    console.error("Error resetting yearly leave balance:", error);
    res.status(500).json({
      message: "เกิดข้อผิดพลาดในการรีเซ็ตยอดวันลาประจำปีงบประมาณ",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get all leave requests with filters
// @route   GET /api/reports/requests
// @access  Private/Admin
const getAllRequests = async (req, res) => {
  try {
    const {
      year,
      status,
      leaveTypeId,
      departmentId,
      page = 1,
      limit = 10,
    } = req.query;

    const where = {};
    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      where.startDate = {
        [Op.between]: [startDate, endDate],
      };
    }
    if (status) {
      where.status = status;
    }
    if (leaveTypeId) {
      where.leaveTypeId = leaveTypeId;
    }

    const userWhere = {};
    if (departmentId) {
      userWhere.departmentId = departmentId;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName", "employeeId", "departmentId"],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["name"],
            },
          ],
        },
        {
          model: LeaveType,
          as: "leaveType",
          attributes: ["name", "code"],
        },
      ],
      order: [["startDate", "DESC"]],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      requests: rows,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getLeaveStatistics,
  exportToExcel,
  exportToPDF,
  resetYearlyLeaveBalance,
  getAllRequests,
};
