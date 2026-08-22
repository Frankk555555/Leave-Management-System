const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

const THAI_MONTH_NAMES = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const THAI_SHORT_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/**
 * Format date string or Date object to Thai short date (e.g. "15 มี.ค. 2568")
 */
const formatThaiShortDate = (dateVal) => {
  if (!dateVal) return "-";
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
    const [y, m, day] = dateVal.split("T")[0].split("-");
    const mIdx = parseInt(m, 10) - 1;
    return `${parseInt(day, 10)} ${THAI_SHORT_MONTHS[mIdx] || ""} ${
      parseInt(y, 10) + 543
    }`;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "-";
  const day = d.getDate();
  const month = THAI_SHORT_MONTHS[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

/**
 * Format report period label for headers
 */
const formatPeriodLabel = (
  year,
  month,
  qStartDate,
  qEndDate,
  startTime,
  endTime,
  timeSlot
) => {
  const slotText =
    timeSlot === "morning"
      ? " (ช่วงเช้า)"
      : timeSlot === "afternoon"
        ? " (ช่วงบ่าย)"
        : timeSlot === "full"
          ? " (เต็มวัน)"
          : "";

  if (qStartDate && qEndDate) {
    const sDateOnly = qStartDate.split("T")[0];
    const eDateOnly = qEndDate.split("T")[0];
    const isSameDate = sDateOnly === eDateOnly;
    const sFormatted = formatThaiShortDate(qStartDate);
    const eFormatted = formatThaiShortDate(qEndDate);

    const sTime =
      startTime ||
      (qStartDate.includes("T")
        ? qStartDate.split("T")[1]?.substring(0, 5)
        : "");
    const eTime =
      endTime ||
      (qEndDate.includes("T") ? qEndDate.split("T")[1]?.substring(0, 5) : "");

    if (isSameDate) {
      const timeStr =
        sTime && eTime
          ? ` เวลา ${sTime} น. - ${eTime} น.`
          : sTime
            ? ` เวลา ${sTime} น.`
            : "";
      return `ประจำวันที่ ${sFormatted}${timeStr}${slotText}`;
    }

    if (sTime || eTime) {
      return `ประจำวันที่ ${sFormatted} ${
        sTime ? `เวลา ${sTime} น.` : ""
      } ถึงวันที่ ${eFormatted} ${
        eTime ? `เวลา ${eTime} น.` : ""
      }${slotText}`;
    }

    const parseMonthYear = (str) => {
      if (typeof str === "string" && /^\d{4}-\d{2}-\d{2}/.test(str)) {
        const [y, m, d] = str.split("T")[0].split("-");
        return {
          day: parseInt(d, 10),
          month: THAI_MONTH_NAMES[parseInt(m, 10) - 1] || "",
          year: parseInt(y, 10) + 543,
        };
      }
      const d = new Date(str);
      return {
        day: d.getDate(),
        month: THAI_MONTH_NAMES[d.getMonth()] || "",
        year: d.getFullYear() + 543,
      };
    };

    const s = parseMonthYear(qStartDate);
    const e = parseMonthYear(qEndDate);

    if (s.day === 1 && e.day >= 28) {
      return `ประจำเดือน${s.month} พ.ศ. ${s.year} ถึงเดือน${e.month} พ.ศ. ${e.year}${slotText}`;
    }

    return `ประจำวันที่ ${sFormatted} ถึงวันที่ ${eFormatted}${slotText}`;
  }

  if (year && month) {
    const mName = THAI_MONTH_NAMES[parseInt(month, 10) - 1] || "";
    const bYear = parseInt(year, 10) + 543;
    return `ประจำเดือน${mName} พ.ศ. ${bYear}${slotText}`;
  }

  if (year) {
    const bYear = parseInt(year, 10) + 543;
    return `ประจำปีงบประมาณ พ.ศ. ${bYear}${slotText}`;
  }

  return `ประจำปีงบประมาณ ทั้งหมด${slotText}`;
};

/**
 * Format current timestamp for PDF footer (e.g. "22/08/68 20:15")
 */
const formatFooterDateTime = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = String((now.getFullYear() + 543) % 100).padStart(2, "0");
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Categorize leave days into standardized Thai civil service columns
 */
const categorizeLeaveDays = (request) => {
  const code = (request.leaveType?.code || "").toLowerCase();
  const name = (request.leaveType?.name || "").toLowerCase();
  const days = Number(request.totalDays) || 0;

  const result = {
    sick: 0,
    personal: 0,
    vacation: 0,
    maternity: 0,
    ordination: 0,
    paternity: 0,
    study: 0,
  };

  if (code === "sick" || name.includes("ป่วย")) {
    result.sick = days;
  } else if (code === "personal" || name.includes("กิจ")) {
    result.personal = days;
  } else if (
    code === "vacation" ||
    name.includes("พักผ่อน") ||
    name.includes("พักร้อน")
  ) {
    result.vacation = days;
  } else if (
    code === "paternity" ||
    name.includes("ภริยา") ||
    name.includes("ภรรยา")
  ) {
    result.paternity = days;
  } else if (code === "maternity" || name.includes("คลอด")) {
    result.maternity = days;
  } else if (
    code === "ordination" ||
    name.includes("อุปสมบท") ||
    name.includes("ฮัจย์")
  ) {
    result.ordination = days;
  } else {
    result.study = days;
  }

  return result;
};

/**
 * Deep Module: ReportExportService
 * Consolidates multi-format report generation (Excel & PDF) behind a unified seam.
 */
const ReportExportService = {
  formatThaiShortDate,
  formatPeriodLabel,
  formatFooterDateTime,
  categorizeLeaveDays,

  /**
   * Export leave report to Excel (ExcelJS)
   */
  async exportExcel({
    leaveRequests,
    queryParams = {},
    meta = {},
    res,
  }) {
    const {
      year,
      qStartDate,
      qEndDate,
      departmentId,
    } = queryParams;

    const {
      selectedPersonName = "ทั้งหมด",
      selectedFacultyName = "ทั้งหมด",
      selectedDeptName = "ทั้งหมด",
    } = meta;

    const workbook = new ExcelJS.Workbook();

    const formatTimeFilterLabel = () => {
      if (qStartDate && qEndDate) {
        const startStr = new Date(qStartDate).toLocaleDateString("th-TH");
        const endStr = new Date(qEndDate).toLocaleDateString("th-TH");
        return `ช่วงวันที่: ${startStr} ถึง ${endStr}`;
      }
      return `ปีงบประมาณ: ${year ? parseInt(year, 10) + 543 : "ทั้งหมด"}`;
    };

    const populateWorksheet = (sheet, title, requests) => {
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

      sheet.mergeCells("A1:J1");
      sheet.getCell("A1").value = title;
      sheet.getCell("A1").font = { size: 16, bold: true };
      sheet.getCell("A1").alignment = { horizontal: "center" };

      sheet.mergeCells("A2:J2");
      sheet.getCell(
        "A2"
      ).value = `${formatTimeFilterLabel()} | บุคคล: ${selectedPersonName} | คณะ: ${selectedFacultyName} | แผนก/สาขาวิชา: ${selectedDeptName}`;
      sheet.getCell("A2").font = { size: 11, italic: true };
      sheet.getCell("A2").alignment = { horizontal: "center" };

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
        "เหตุผล",
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

    // 1. Create Main Summary Worksheet
    const mainSheet = workbook.addWorksheet("รวมทุกสาขา");
    populateWorksheet(mainSheet, "รายงานสถิติการลา (รวมทุกสาขา)", leaveRequests);

    // 2. Create Dynamic Department Worksheets
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
        const cleanName = deptName
          .replace(/[\\/?*:[\]]/g, "")
          .substring(0, 30);
        const deptSheet = workbook.addWorksheet(cleanName || "แผนกอื่นๆ");
        populateWorksheet(
          deptSheet,
          `รายงานสถิติการลา (${deptName})`,
          deptRequests
        );
      });
    }

    if (res) {
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
    }

    return workbook;
  },

  /**
   * Export leave report to PDF (PDFKit OPR-HR-034 format)
   */
  async exportPDF({
    userGroups,
    queryParams = {},
    actor,
    res,
  }) {
    const {
      year,
      month,
      timeSlot,
      startTime,
      endTime,
      startDate: qStartDate,
      endDate: qEndDate,
    } = queryParams;

    const fontPath = fs.existsSync(
      path.join(__dirname, "../fonts/THSarabun.ttf")
    )
      ? path.join(__dirname, "../fonts/THSarabun.ttf")
      : path.join(__dirname, "../fonts/Mitr-Regular.ttf");

    const logoPath = fs.existsSync(
      path.join(__dirname, "../assets/bru-logo.png")
    )
      ? path.join(__dirname, "../assets/bru-logo.png")
      : path.join(__dirname, "../../client/public/bru-logo-color.png");

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 30, bottom: 20, left: 36, right: 36 },
      bufferPages: true,
    });

    if (res) {
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
    }

    const periodLabel = formatPeriodLabel(
      year,
      month,
      qStartDate,
      qEndDate,
      startTime,
      endTime,
      timeSlot
    );

    const startX = 36;
    const startY = 112;
    const rowHeight = 22;
    const headerHeight = 24;

    const columns = [
      { label: "ครั้งที่", width: 45, align: "center" },
      { label: "วันที่เริ่มลา", width: 75, align: "center" },
      { label: "วันที่ลาสิ้นสุด", width: 75, align: "center" },
      { label: "ลาป่วย", width: 55, align: "center" },
      { label: "ลากิจ", width: 55, align: "center" },
      { label: "ลาพักผ่อน", width: 60, align: "center" },
      { label: "ลาคลอด", width: 55, align: "center" },
      { label: "ลาอุปสมบท", width: 65, align: "center" },
      { label: "ลาช่วยภริยา", width: 65, align: "center" },
      { label: "ลาศึกษา", width: 55, align: "center" },
      { label: "หมายเหตุ", width: 165, align: "left" },
    ];

    const totalTableWidth = columns.reduce((sum, col) => sum + col.width, 0);

    const renderHeaderAndInfo = (user) => {
      doc.font(fontPath);

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 36, 28, { width: 38, height: 48 });
      }

      doc
        .fontSize(15)
        .fillColor("#000000")
        .text("มหาวิทยาลัยราชภัฏบุรีรัมย์", 82, 34);
      doc.fontSize(12).fillColor("#333333").text("ระบบบุคลากร", 82, 54);

      doc
        .fontSize(15)
        .fillColor("#000000")
        .text("รายงานประวัติการลา", 450, 34, {
          width: 356,
          align: "right",
        });
      doc
        .fontSize(11)
        .fillColor("#333333")
        .text(periodLabel, 450, 54, {
          width: 356,
          align: "right",
        });

      const infoY = 88;
      doc.fontSize(12).fillColor("#000000");
      const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      const position = user.position || "บุคลากร";
      const deptName =
        user.department?.name || user.affiliation || "กองการบริหารงานบุคคล";

      doc.text(`ชื่อ - นามสกุล  ${fullName}`, 36, infoY);
      doc.text(`ตำแหน่ง ${position}`, 270, infoY);
      doc.text(`สังกัด/หน่วยงาน ${deptName}`, 460, infoY);

      doc.rect(startX, startY, totalTableWidth, headerHeight).fill("#b8b8b8");
      doc.lineWidth(0.5).strokeColor("#777777");

      let currentX = startX;
      columns.forEach((col) => {
        doc.rect(currentX, startY, col.width, headerHeight).stroke();
        doc.fontSize(11).fillColor("#000000");
        doc.text(col.label, currentX, startY + 5, {
          width: col.width,
          align: "center",
        });
        currentX += col.width;
      });
    };

    userGroups.forEach((group, groupIndex) => {
      if (groupIndex > 0) {
        doc.addPage();
      }

      const { user, requests } = group;
      renderHeaderAndInfo(user);

      const totals = {
        sick: 0,
        personal: 0,
        vacation: 0,
        maternity: 0,
        ordination: 0,
        paternity: 0,
        study: 0,
      };

      let currentY = startY + headerHeight;

      requests.forEach((reqItem, index) => {
        if (index > 0 && index % 15 === 0) {
          doc.addPage();
          renderHeaderAndInfo(user);
          currentY = startY + headerHeight;
        }

        const cat = categorizeLeaveDays(reqItem);
        totals.sick += cat.sick;
        totals.personal += cat.personal;
        totals.vacation += cat.vacation;
        totals.maternity += cat.maternity;
        totals.ordination += cat.ordination;
        totals.paternity += cat.paternity;
        totals.study += cat.study;

        const rowValues = [
          { text: String(index + 1), align: "center" },
          { text: formatThaiShortDate(reqItem.startDate), align: "center" },
          { text: formatThaiShortDate(reqItem.endDate), align: "center" },
          { text: String(cat.sick), align: "center" },
          { text: String(cat.personal), align: "center" },
          { text: String(cat.vacation), align: "center" },
          { text: String(cat.maternity), align: "center" },
          { text: String(cat.ordination), align: "center" },
          { text: String(cat.paternity), align: "center" },
          { text: String(cat.study), align: "center" },
          { text: reqItem.reason || "", align: "left" },
        ];

        let cellX = startX;
        rowValues.forEach((val, colIdx) => {
          const col = columns[colIdx];
          doc.rect(cellX, currentY, col.width, rowHeight).stroke();
          doc.fontSize(11).fillColor("#000000");
          const textX = val.align === "left" ? cellX + 5 : cellX;
          const textW = val.align === "left" ? col.width - 10 : col.width;
          doc.text(val.text, textX, currentY + 5, {
            width: textW,
            align: val.align,
          });
          cellX += col.width;
        });

        currentY += rowHeight;
      });

      const first3Width =
        columns[0].width + columns[1].width + columns[2].width;
      doc.rect(startX, currentY, first3Width, rowHeight).stroke();
      doc.fontSize(11).fillColor("#000000");
      doc.text("รวม", startX, currentY + 5, {
        width: first3Width,
        align: "center",
      });

      let sumX = startX + first3Width;
      const sumValues = [
        String(totals.sick),
        String(totals.personal),
        String(totals.vacation),
        String(totals.maternity),
        String(totals.ordination),
        String(totals.paternity),
        String(totals.study),
        "",
      ];

      sumValues.forEach((val, idx) => {
        const col = columns[idx + 3];
        doc.rect(sumX, currentY, col.width, rowHeight).stroke();
        if (val) {
          doc.fontSize(11).fillColor("#000000");
          doc.text(val, sumX, currentY + 5, {
            width: col.width,
            align: "center",
          });
        }
        sumX += col.width;
      });
    });

    const range = doc.bufferedPageRange();
    const footerDateTime = formatFooterDateTime();
    const printUser = (
      actor?.employeeId ||
      (actor?.firstName
        ? `${actor.firstName}.${
            actor.lastName ? actor.lastName.substring(0, 2) : ""
          }`
        : "CHAWANWIT.WA")
    ).toUpperCase();

    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const oldBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      doc
        .moveTo(36, 550)
        .lineTo(36 + totalTableWidth, 550)
        .lineWidth(0.5)
        .strokeColor("#888888")
        .stroke();

      doc.fontSize(10).fillColor("#333333");
      doc.text("OPR-HR-034 ( งานลงเวลาบันทึกเวลา )", 36, 558, {
        lineBreak: false,
      });

      const footerRight = `รหัสผู้ใช้: ${printUser} ${footerDateTime} หน้า ${
        i + 1
      }/ ${range.count}`;
      doc.text(footerRight, 400, 558, {
        width: 36 + totalTableWidth - 400,
        align: "right",
        lineBreak: false,
      });

      doc.page.margins.bottom = oldBottomMargin;
    }

    doc.end();
    return doc;
  },
};

module.exports = {
  ReportExportService,
  formatThaiShortDate,
  formatPeriodLabel,
  formatFooterDateTime,
  categorizeLeaveDays,
};
