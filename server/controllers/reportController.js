const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit-table");
const {
  LeaveRequest,
  User,
  LeaveType,
  LeaveBalance,
  Department,
  Faculty,
} = require("../models");
const { Op } = require("sequelize");
const { getFiscalYear } = require("../services/leaveValidationService");

// @desc    Get leave statistics
// @route   GET /api/reports/statistics
// @access  Private/Admin
const getLeaveStatistics = async (req, res) => {
  try {
    const { year, startDate: qStartDate, endDate: qEndDate } = req.query;
    let currentYear = year || getFiscalYear();
    
    let startDate, endDate;
    if (qStartDate && qEndDate) {
      startDate = new Date(qStartDate);
      endDate = new Date(qEndDate);
      endDate.setHours(23, 59, 59, 999);
      currentYear = getFiscalYear(startDate);
    } else {
      startDate = new Date(currentYear, 0, 1);
      endDate = new Date(currentYear, 11, 31, 23, 59, 59);
    }

    // Get all leave requests for the range with LeaveType
    const leaveRequests = await LeaveRequest.findAll({
      where: {
        startDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "departmentId"],
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
          attributes: ["id", "name", "code"],
        },
      ],
    });

    // Statistics by type (use leaveType.code as key)
    const byType = leaveRequests.reduce((acc, req) => {
      const typeCode = req.leaveType?.code || "unknown";
      acc[typeCode] = (acc[typeCode] || 0) + parseFloat(req.totalDays);
      return acc;
    }, {});

    // Statistics by department
    const byDepartment = leaveRequests.reduce((acc, req) => {
      const dept = req.user?.department?.name || "ไม่ระบุ";
      acc[dept] = (acc[dept] || 0) + parseFloat(req.totalDays);
      return acc;
    }, {});

    // Statistics by month
    const byMonth = Array(12).fill(0);
    leaveRequests.forEach((req) => {
      const month = new Date(req.startDate).getMonth();
      byMonth[month] += parseFloat(req.totalDays);
    });

    // Statistics by status
    const byStatus = leaveRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {});

    // Total employees
    const totalEmployees = await User.count({ where: { isActive: true } });

    res.json({
      year: currentYear,
      totalRequests: leaveRequests.length,
      totalDays: leaveRequests.reduce(
        (sum, r) => sum + parseFloat(r.totalDays),
        0
      ),
      totalEmployees,
      byType,
      byDepartment,
      byMonth,
      byStatus,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Export leave report to Excel
// @route   GET /api/reports/export/excel
// @access  Private/Admin
const exportToExcel = async (req, res) => {
  try {
    const { year, month, userId, facultyId, departmentId, startDate: qStartDate, endDate: qEndDate } = req.query;

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

    let where = {};
    if (qStartDate && qEndDate) {
      const start = new Date(qStartDate);
      const end = new Date(qEndDate);
      end.setHours(23, 59, 59, 999);
      where.startDate = {
        [Op.between]: [start, end],
      };
    } else if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, 1);
      const endDate = month
        ? new Date(year, month, 0)
        : new Date(year, 11, 31, 23, 59, 59);
      where.startDate = {
        [Op.between]: [startDate, endDate],
      };
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

    const deptWhere = {};
    let deptRequired = false;
    if (facultyId) {
      deptWhere.facultyId = facultyId;
      deptRequired = true;
      userRequired = true;
    }

    const leaveRequests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["employeeId", "firstName", "lastName", "position", "departmentId"],
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

    const workbook = new ExcelJS.Workbook();

    const formatTimeFilterLabel = () => {
      if (qStartDate && qEndDate) {
        const startStr = new Date(qStartDate).toLocaleDateString("th-TH");
        const endStr = new Date(qEndDate).toLocaleDateString("th-TH");
        return `ช่วงวันที่: ${startStr} ถึง ${endStr}`;
      }
      return `ปีงบประมาณ: ${year ? parseInt(year) + 543 : "ทั้งหมด"}`;
    };

    const populateWorksheet = (sheet, title, requests) => {
      // Setup columns with width but manual headers
      sheet.columns = [
        { key: "employeeId", width: 15 },
        { key: "employeeName", width: 25 },
        { key: "department", width: 20 },
        { key: "leaveTypeName", width: 15 },
        { key: "startDate", width: 15 },
        { key: "endDate", width: 15 },
        { key: "totalDays", width: 12 },
        { key: "status", width: 15 },
        { key: "approvedBy", width: 20 },
        { key: "reason", width: 30 },
      ];

      // Write title & filters at the top
      sheet.mergeCells("A1:J1");
      sheet.getCell("A1").value = title;
      sheet.getCell("A1").font = { size: 16, bold: true };
      sheet.getCell("A1").alignment = { horizontal: "center" };

      sheet.mergeCells("A2:J2");
      sheet.getCell("A2").value = `${formatTimeFilterLabel()} | บุคคล: ${selectedPersonName} | คณะ: ${selectedFacultyName} | แผนก/สาขาวิชา: ${selectedDeptName}`;
      sheet.getCell("A2").font = { size: 11, italic: true };
      sheet.getCell("A2").alignment = { horizontal: "center" };

      // Table Headers at Row 4
      const headerRow = sheet.getRow(4);
      headerRow.values = [
        "รหัสพนักงาน",
        "ชื่อ-นามสกุล",
        "แผนก",
        "ประเภทการลา",
        "วันที่เริ่ม",
        "วันที่สิ้นสุด",
        "จำนวนวัน",
        "สถานะ",
        "ผู้อนุมัติ",
        "เหตุผล"
      ];
      headerRow.font = { color: { argb: "FFFFFF" }, bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF667EEA" },
      };
      headerRow.height = 25;

      const statusNames = {
        pending: "รออนุมัติ",
        approved: "อนุมัติแล้ว",
        rejected: "ไม่อนุมัติ",
        confirmed: "ยืนยันแล้ว",
        cancelled: "ยกเลิก",
      };

      requests.forEach((request) => {
        sheet.addRow({
          employeeId: request.user?.employeeId || "",
          employeeName: `${request.user?.firstName || ""} ${
            request.user?.lastName || ""
          }`,
          department: request.user?.department?.name || "",
          leaveTypeName: request.leaveType?.name || "",
          startDate: new Date(request.startDate).toLocaleDateString("th-TH"),
          endDate: new Date(request.endDate).toLocaleDateString("th-TH"),
          totalDays: request.totalDays,
          status: statusNames[request.status] || request.status,
          approvedBy: request.approver
            ? `${request.approver.firstName} ${request.approver.lastName}`
            : "",
          reason: request.reason,
        });
      });
    };

    // 1. Create Main Worksheet (Summary tab)
    const mainSheet = workbook.addWorksheet("รวมทุกสาขา");
    populateWorksheet(mainSheet, "รายงานสถิติการลา (รวมทุกสาขา)", leaveRequests);

    // 2. Create Dynamic Worksheets per Department (if no specific department is filtered)
    if (!departmentId) {
      const requestsByDept = {};
      leaveRequests.forEach((req) => {
        const deptName = req.user?.department?.name || "ไม่ระบุแผนก";
        if (!requestsByDept[deptName]) {
          requestsByDept[deptName] = [];
        }
        requestsByDept[deptName].push(req);
      });

      Object.entries(requestsByDept).forEach(([deptName, deptRequests]) => {
        // Excel worksheet name limit is 30 chars and cannot contain: \ / ? * : [ ]
        const cleanName = deptName.replace(/[\\/?*:\[\]]/g, "").substring(0, 30);
        const deptSheet = workbook.addWorksheet(cleanName || "แผนกอื่นๆ");
        populateWorksheet(deptSheet, `รายงานสถิติการลา (${deptName})`, deptRequests);
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    let filename = `leave-report-${year || "all"}`;
    if (qStartDate && qEndDate) {
      filename = `leave-report-${qStartDate}_to_${qEndDate}`;
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Export leave report to PDF
// @route   GET /api/reports/export/pdf
// @access  Private/Admin
const exportToPDF = async (req, res) => {
  try {
    const { year, month, userId, facultyId, departmentId, startDate: qStartDate, endDate: qEndDate } = req.query;

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

    let where = {};
    if (qStartDate && qEndDate) {
      const start = new Date(qStartDate);
      const end = new Date(qEndDate);
      end.setHours(23, 59, 59, 999);
      where.startDate = {
        [Op.between]: [start, end],
      };
    } else if (year) {
      const startDate = new Date(year, month ? month - 1 : 0, 1);
      const endDate = month
        ? new Date(year, month, 0)
        : new Date(year, 11, 31, 23, 59, 59);
      where.startDate = {
        [Op.between]: [startDate, endDate],
      };
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

    const deptWhere = {};
    let deptRequired = false;
    if (facultyId) {
      deptWhere.facultyId = facultyId;
      deptRequired = true;
      userRequired = true;
    }

    const leaveRequests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["employeeId", "firstName", "lastName", "position", "departmentId"],
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
      order: [["startDate", "DESC"]],
    });

    const path = require("path");
    const fontPath = path.join(__dirname, "../fonts/Mitr-Regular.ttf");

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      font: fontPath, // Set default font
    });

    res.setHeader("Content-Type", "application/pdf");

    let filename = `leave-report-${year || "all"}`;
    if (qStartDate && qEndDate) {
      filename = `leave-report-${qStartDate}_to_${qEndDate}`;
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}.pdf`
    );

    doc.pipe(res);

    // Register font family to be safe
    doc.font(fontPath);

    // Title
    doc.fontSize(22).text("รายงานสถิติการลา", { align: "center" });
    doc.moveDown(0.3);

    let timeLabel = `ปีงบประมาณ: ${year ? parseInt(year) + 543 : "ทั้งหมด"} ${month ? `| เดือนที่: ${month}` : ""}`;
    if (qStartDate && qEndDate) {
      const startStr = new Date(qStartDate).toLocaleDateString("th-TH");
      const endStr = new Date(qEndDate).toLocaleDateString("th-TH");
      timeLabel = `ช่วงวันที่: ${startStr} - ${endStr}`;
    }
    doc.fontSize(12).text(timeLabel, { align: "center" });
    doc.moveDown(0.3);
    doc.moveDown(0.3);
    
    // Primary Filter Criteria Secondary Header
    doc.fontSize(10).text(
      `คัดกรองโดย: บุคคล: ${selectedPersonName} | คณะ: ${selectedFacultyName} | แผนก/สาขา: ${selectedDeptName}`,
      { align: "center" }
    );
    doc.moveDown(1.5);

    // Summary
    const stats = {
      total: leaveRequests.length,
      approved: leaveRequests.filter((r) => r.status === "approved" || r.status === "confirmed").length,
      pending: leaveRequests.filter((r) => r.status === "pending").length,
      rejected: leaveRequests.filter((r) => r.status === "rejected" || r.status === "cancelled").length,
    };

    doc.fontSize(12).text(`สรุปภาพรวมคำร้อง:`, { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`จำนวนคำร้องทั้งหมด: ${stats.total} รายการ`);
    doc.text(`อนุมัติแล้ว: ${stats.approved} รายการ | รออนุมัติ: ${stats.pending} รายการ | ไม่อนุมัติ/ยกเลิก: ${stats.rejected} รายการ`);
    doc.moveDown(1.5);

    const statusNames = {
      pending: "รออนุมัติ",
      approved: "อนุมัติแล้ว",
      rejected: "ไม่อนุมัติ",
      confirmed: "ยืนยันแล้ว",
      cancelled: "ยกเลิก",
    };

    // Table Data Formatting
    const tableData = leaveRequests.map((request, index) => {
      const leaveTypeName = request.leaveType?.name || "-";
      const startDateStr = new Date(request.startDate).toLocaleDateString("th-TH");
      const endDateStr = new Date(request.endDate).toLocaleDateString("th-TH");
      
      const statusText = statusNames[request.status] || request.status || "ไม่ระบุ";

      return {
        no: String(index + 1),
        name: `${request.user?.firstName || ""} ${request.user?.lastName || ""}`,
        department: request.user?.department?.name || "-",
        leaveType: leaveTypeName,
        dates: `${startDateStr} - ${endDateStr}`,
        days: String(request.totalDays),
        status: statusText
      };
    });

    const table = {
      title: "รายละเอียดการลา",
      headers: [
        { label: "ลำดับ", property: "no", width: 30, renderer: null, align: "center" },
        { label: "ชื่อ-นามสกุล", property: "name", width: 105, renderer: null },
        { label: "แผนก", property: "department", width: 105, renderer: null },
        { label: "ประเภท", property: "leaveType", width: 60, renderer: null },
        { label: "วันที่ลา", property: "dates", width: 105, renderer: null, align: "center" },
        { label: "จำนวน(วัน)", property: "days", width: 55, renderer: null, align: "center" },
        { label: "สถานะ", property: "status", width: 55, renderer: null, align: "center" },
      ],
      datas: tableData,
    };

    await doc.table(table, {
      prepareHeader: () => doc.font(fontPath).fontSize(10),
      prepareRow: (row, indexColumn, indexRow, rectRow) => {
        doc.font(fontPath).fontSize(9);
      },
      padding: 5
    });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Reset yearly leave balance for all employees (รีเซ็ตวันลาประจำปีงบประมาณ 1 ต.ค.)
// @route   POST /api/reports/reset-yearly
// @access  Private/Admin
const resetYearlyLeaveBalance = async (req, res) => {
  try {
    const currentYear = getFiscalYear();
    const newYear = currentYear + 1;

    const users = await User.findAll({ where: { isActive: true } });
    const leaveTypes = await LeaveType.findAll({ where: { isActive: true } });

    const results = [];

    for (const user of users) {
      // Calculate years of service
      let yearsOfService = 0;
      if (user.startDate) {
        const startDate = new Date(user.startDate);
        yearsOfService = Math.floor(
          (new Date() - startDate) / (365.25 * 24 * 60 * 60 * 1000)
        );
      }

      const maxAccrued = yearsOfService >= 10 ? 20 : 10;
      let newAccrued = 0;
      let newVacation = 0;

      for (const lt of leaveTypes) {
        // Get current year balance
        const currentBalance = await LeaveBalance.findOne({
          where: { userId: user.id, leaveTypeId: lt.id, year: currentYear },
        });

        let carriedOver = 0;
        if (currentBalance && lt.code === "vacation") {
          const remaining = currentBalance.getRemainingDays();
          carriedOver = Math.min(remaining, maxAccrued);
          newAccrued = carriedOver;
          newVacation = carriedOver + lt.defaultDays;
        }

        // Create balance for new year
        await LeaveBalance.findOrCreate({
          where: { userId: user.id, leaveTypeId: lt.id, year: newYear },
          defaults: {
            totalDays: lt.defaultDays,
            usedDays: 0,
            carriedOverDays: carriedOver,
          },
        });
      }

      results.push({
        employeeId: user.employeeId,
        name: `${user.firstName} ${user.lastName}`,
        yearsOfService,
        newAccrued,
        newVacation,
      });
    }

    res.json({
      message: `รีเซ็ตวันลาประจำปีงบประมาณเรียบร้อยแล้ว (คำนวณสะสมวันลาพักผ่อน)`,
      updatedCount: results.length,
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all leave requests (admin)
// @route   GET /api/reports/all-requests
// @access  Private/Admin
const getAllRequests = async (req, res) => {
  try {
    const { year, status, departmentId } = req.query;

    let where = {};

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

    const include = [
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
        ],
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "name"],
          },
        ],
        where: departmentId ? { departmentId } : undefined,
      },
      {
        model: User,
        as: "approver",
        attributes: ["id", "firstName", "lastName"],
      },
      {
        model: LeaveType,
        as: "leaveType",
        attributes: ["id", "name", "code"],
      },
    ];

    const leaveRequests = await LeaveRequest.findAll({
      where,
      include,
      order: [["createdAt", "DESC"]],
    });

    res.json(leaveRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  getLeaveStatistics,
  exportToExcel,
  exportToPDF,
  resetYearlyLeaveBalance,
  getAllRequests,
};
