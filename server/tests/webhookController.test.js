const { getWeeklyReport } = require("../controllers/webhookController");
const { LeaveRequest, Holiday } = require("../models");

jest.mock("../models", () => ({
  LeaveRequest: {
    findAll: jest.fn(),
  },
  Holiday: {
    findAll: jest.fn().mockResolvedValue([]),
  },
  User: {},
  LeaveType: {},
  Department: {},
}));

describe("webhookController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getWeeklyReport", () => {
    it("should correctly compute stats including pending_dean, pending_vp, and confirmed", async () => {
      const mockLeaveRequests = [
        {
          id: 1,
          status: "pending",
          totalDays: 2,
          startDate: "2025-06-01",
          endDate: "2025-06-02",
          user: { firstName: "ก", lastName: "ข", personnelType: "university_employee_academic" },
          leaveType: { name: "ลาพักผ่อน" },
        },
        {
          id: 2,
          status: "pending_dean",
          totalDays: 3,
          startDate: "2025-06-03",
          endDate: "2025-06-05",
          user: { firstName: "ค", lastName: "ง", personnelType: "university_employee_academic" },
          leaveType: { name: "ลากิจ" },
        },
        {
          id: 3,
          status: "pending_vp",
          totalDays: 1,
          startDate: "2025-06-06",
          endDate: "2025-06-06",
          user: { firstName: "จ", lastName: "ฉ", personnelType: "university_employee_academic" },
          leaveType: { name: "ลาป่วย" },
        },
        {
          id: 4,
          status: "approved",
          totalDays: 2.5,
          startDate: "2025-06-07",
          endDate: "2025-06-09",
          user: { firstName: "ช", lastName: "ซ", personnelType: "university_employee_academic" },
          leaveType: { name: "ลาพักผ่อน" },
        },
        {
          id: 5,
          status: "confirmed",
          totalDays: 1.5,
          startDate: "2025-06-10",
          endDate: "2025-06-11",
          user: { firstName: "ฌ", lastName: "ญ", personnelType: "university_employee_academic" },
          leaveType: { name: "ลาพักผ่อน" },
        },
        {
          id: 6,
          status: "rejected",
          totalDays: 1,
          startDate: "2025-06-12",
          endDate: "2025-06-12",
          user: { firstName: "ฎ", lastName: "ฏ", personnelType: "university_employee_academic" },
          leaveType: { name: "ลากิจ" },
        },
      ];

      LeaveRequest.findAll.mockResolvedValue(mockLeaveRequests);

      process.env.N8N_API_KEY = "test-secret-key";
      const req = {
        query: {},
        headers: {
          "x-api-key": "test-secret-key",
        },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getWeeklyReport(req, res);

      expect(res.json).toHaveBeenCalled();
      const summaryData = res.json.mock.calls[0][0];

      // Verify overall statistics
      expect(summaryData.statistics.total).toBe(6);
      expect(summaryData.statistics.approved).toBe(2); // 1 approved + 1 confirmed
      expect(summaryData.statistics.pending).toBe(3); // 1 pending + 1 pending_dean + 1 pending_vp
      expect(summaryData.statistics.pending_head).toBe(1);
      expect(summaryData.statistics.pending_dean).toBe(1);
      expect(summaryData.statistics.pending_vp).toBe(1);
      expect(summaryData.statistics.rejected).toBe(1);
      expect(summaryData.statistics.confirmed).toBe(1);

      // Verify total days includes both approved and confirmed (2.5 + 1.5 = 4)
      expect(summaryData.totalLeaveDays).toBe(4);

      // Verify status mapping in leaveDetails
      const details = summaryData.leaveDetails;
      expect(details[0].status).toBe("รอหัวหน้างาน");
      expect(details[1].status).toBe("รอคณบดี/ผอ.สำนัก");
      expect(details[2].status).toBe("รอคำสั่งรองอธิการบดี");
      expect(details[3].status).toBe("อนุมัติ");
      expect(details[4].status).toBe("ยืนยันแล้ว");
      expect(details[5].status).toBe("ปฏิเสธ");
    });
  });
});
