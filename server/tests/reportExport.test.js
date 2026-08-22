const {
  ReportExportService,
  formatThaiShortDate,
  formatPeriodLabel,
  categorizeLeaveDays,
} = require("../services/reportExportService");

describe("ReportExportService Deep Module", () => {
  describe("categorizeLeaveDays", () => {
    it("should correctly categorize sick leave", () => {
      const res = categorizeLeaveDays({
        totalDays: 2.5,
        leaveType: { code: "sick", name: "ลาป่วย" },
      });
      expect(res.sick).toBe(2.5);
      expect(res.personal).toBe(0);
      expect(res.vacation).toBe(0);
    });

    it("should correctly categorize vacation leave", () => {
      const res = categorizeLeaveDays({
        totalDays: 3,
        leaveType: { code: "vacation", name: "ลาพักผ่อน" },
      });
      expect(res.vacation).toBe(3);
      expect(res.sick).toBe(0);
    });

    it("should correctly categorize paternity and ordination leave", () => {
      const resPat = categorizeLeaveDays({
        totalDays: 5,
        leaveType: { code: "paternity", name: "ลาไปช่วยเหลือภริยาที่คลอดบุตร" },
      });
      expect(resPat.paternity).toBe(5);

      const resOrd = categorizeLeaveDays({
        totalDays: 15,
        leaveType: { code: "ordination", name: "ลาอุปสมบท" },
      });
      expect(resOrd.ordination).toBe(15);
    });

    it("should fallback unknown leave types to study", () => {
      const res = categorizeLeaveDays({
        totalDays: 10,
        leaveType: { code: "other", name: "ลาศึกษาต่อ" },
      });
      expect(res.study).toBe(10);
    });
  });

  describe("formatThaiShortDate", () => {
    it("should format ISO date strings with Thai Buddhist era year", () => {
      expect(formatThaiShortDate("2025-08-22")).toBe("22 ส.ค. 2568");
      expect(formatThaiShortDate("2026-01-05T00:00:00.000Z")).toBe("5 ม.ค. 2569");
    });

    it("should handle null or invalid date gracefully", () => {
      expect(formatThaiShortDate(null)).toBe("-");
      expect(formatThaiShortDate("invalid-date")).toBe("-");
    });
  });

  describe("formatPeriodLabel", () => {
    it("should format fiscal year period", () => {
      const label = formatPeriodLabel("2025", null, null, null, null, null, "full");
      expect(label).toContain("ประจำปีงบประมาณ พ.ศ. 2568 (เต็มวัน)");
    });

    it("should format specific month period", () => {
      const label = formatPeriodLabel("2025", "3", null, null, null, null, "morning");
      expect(label).toContain("ประจำเดือนมีนาคม พ.ศ. 2568 (ช่วงเช้า)");
    });

    it("should format date range period", () => {
      const label = formatPeriodLabel(
        null,
        null,
        "2025-04-01",
        "2025-04-10",
        null,
        null,
        "all"
      );
      expect(label).toContain("1 เม.ย. 2568");
      expect(label).toContain("10 เม.ย. 2568");
    });
  });

  describe("exportExcel", () => {
    it("should build ExcelJS workbook with main and department sheets", async () => {
      const mockRequests = [
        {
          totalDays: 2,
          startDate: "2025-03-01",
          endDate: "2025-03-02",
          status: "confirmed",
          reason: "ไปราชการ",
          user: {
            employeeId: "2568001",
            firstName: "สมชาย",
            lastName: "ใจดี",
            department: { name: "สาขาวิทยาการคอมพิวเตอร์" },
          },
          approver: { firstName: "หัวหน้า", lastName: "สาขา" },
          leaveType: { name: "ลาพักผ่อน" },
        },
      ];

      const workbook = await ReportExportService.exportExcel({
        leaveRequests: mockRequests,
        queryParams: { year: "2025" },
        meta: { selectedDeptName: "ทั้งหมด" },
        res: null, // Don't write to HTTP response in test
      });

      expect(workbook.worksheets.length).toBeGreaterThanOrEqual(2);
      expect(workbook.getWorksheet("รวมทุกสาขา")).toBeDefined();
      expect(workbook.getWorksheet("สาขาวิทยาการคอมพิวเตอร์")).toBeDefined();
    });
  });

  describe("exportPDF", () => {
    it("should construct PDFDocument stream without errors", async () => {
      const mockUser = {
        firstName: "สมชาย",
        lastName: "ใจดี",
        position: "อาจารย์",
        department: { name: "สาขาวิทยาการคอมพิวเตอร์" },
      };

      const userGroups = [
        {
          user: mockUser,
          requests: [
            {
              startDate: "2025-05-01",
              endDate: "2025-05-02",
              totalDays: 2,
              reason: "ธุระส่วนตัว",
              leaveType: { code: "personal", name: "ลากิจ" },
            },
          ],
        },
      ];

      const doc = await ReportExportService.exportPDF({
        userGroups,
        queryParams: { year: "2025" },
        actor: { employeeId: "ADMIN001" },
        res: null,
      });

      expect(doc).toBeDefined();
      expect(typeof doc.pipe).toBe("function");
    });
  });
});
