const { getLeaveStatistics } = require("../controllers/reportController");
const { LeaveRequest, User } = require("../models");

jest.mock("../models", () => ({
  LeaveRequest: {
    findAll: jest.fn(),
  },
  User: {
    count: jest.fn(),
    findByPk: jest.fn(),
  },
  LeaveType: {},
  Department: {},
  Faculty: {},
}));

jest.mock("../services/leaveValidationService", () => ({
  getFiscalYear: jest.fn().mockReturnValue(2024),
}));

jest.mock("../services/reportExportService", () => ({
  ReportExportService: {
    exportExcel: jest.fn(),
    exportPDF: jest.fn(),
  },
}));

describe("reportController - getLeaveStatistics (characterization)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const buildReq = (query = {}) => ({ query });
  const buildRes = () => ({
    json: jest.fn(),
    status: jest.fn().mockReturnThis(),
  });

  const mockLeaveRequests = [
    {
      status: "approved",
      totalDays: "2.5",
      startDate: new Date(2024, 1, 10), // Feb
      leaveType: { code: "sick", name: "ลาป่วย" },
      user: { department: { name: "แผนกไอที" } },
    },
    {
      status: "confirmed",
      totalDays: "1",
      startDate: new Date(2024, 1, 15), // Feb
      leaveType: { code: "vacation", name: "ลาพักผ่อน" },
      user: { department: { name: "แผนกไอที" } },
    },
    {
      status: "pending",
      totalDays: "3",
      startDate: new Date(2024, 5, 1), // June
      leaveType: { code: "personal", name: "ลากิจ" },
      user: { department: { name: "แผนกบุคคล" } },
    },
    {
      status: "rejected",
      totalDays: "1",
      startDate: new Date(2024, 5, 5),
      leaveType: { code: "sick", name: "ลาป่วย" },
      user: { department: null },
    },
  ];

  it("should return correct aggregated statistics shape for default year query", async () => {
    LeaveRequest.findAll.mockResolvedValue(mockLeaveRequests);
    User.count.mockResolvedValue(42);

    const req = buildReq({});
    const res = buildRes();

    await getLeaveStatistics(req, res);

    expect(res.json).toHaveBeenCalledWith({
      year: 2024,
      totalRequests: 4,
      totalDays: 3.5,
      totalEmployees: 42,
      byType: {
        sick: 2.5,
        vacation: 1,
      },
      byDepartment: {
        แผนกไอที: 3.5,
      },
      byMonth: (() => {
        const arr = Array(12).fill(0);
        arr[1] = 3.5; // Feb
        return arr;
      })(),
      byStatus: {
        approved: 1,
        confirmed: 1,
        pending: 1,
        rejected: 1,
      },
    });
  });

  it("should handle empty results", async () => {
    LeaveRequest.findAll.mockResolvedValue([]);
    User.count.mockResolvedValue(0);

    const req = buildReq({ year: "2023" });
    const res = buildRes();

    await getLeaveStatistics(req, res);

    expect(res.json).toHaveBeenCalledWith({
      year: "2023",
      totalRequests: 0,
      totalDays: 0,
      totalEmployees: 0,
      byType: {},
      byDepartment: {},
      byMonth: Array(12).fill(0),
      byStatus: {},
    });
  });

  it("should handle server errors with 500 status", async () => {
    LeaveRequest.findAll.mockRejectedValue(new Error("DB down"));

    const req = buildReq({});
    const res = buildRes();

    await getLeaveStatistics(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Server error" })
    );
  });
});
