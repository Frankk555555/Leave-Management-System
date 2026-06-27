const { Op } = require("sequelize");
const validationService = require("../services/leaveValidationService");

// Mock Models
jest.mock("../models", () => {
  return {
    LeaveType: {
      findOne: jest.fn(),
      findByPk: jest.fn(),
    },
    LeaveBalance: {
      findOne: jest.fn(),
    },
    LeaveRequest: {
      findAll: jest.fn(),
    },
    User: {
      findOne: jest.fn(),
    }
  };
});

const { LeaveType, LeaveBalance, LeaveRequest } = require("../models");

describe("Leave Validation Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("calculateTotalDays", () => {
    it("should correctly calculate total days including weekends", () => {
      const start = "2024-01-01"; // Monday
      const end = "2024-01-07"; // Sunday
      const days = validationService.calculateTotalDays(start, end);
      expect(days).toBe(7);
    });

    it("should return 1 day for same start and end date", () => {
      const days = validationService.calculateTotalDays("2024-01-01", "2024-01-01");
      expect(days).toBe(1);
    });
  });

  describe("getEffectiveRemainingDays", () => {
    it("should calculate effective days by subtracting pending requests", async () => {
      // Mock LeaveBalance to return 10 remaining days
      LeaveBalance.findOne.mockResolvedValue({
        getRemainingDays: () => 10
      });

      // Mock LeaveRequest to return two pending requests totaling 3 days
      LeaveRequest.findAll.mockResolvedValue([
        { startDate: "2024-05-01", totalDays: 2 },
        { startDate: "2024-06-01", totalDays: 1 }
      ]);

      const result = await validationService.getEffectiveRemainingDays(1, 1, "2024-07-01");
      
      expect(LeaveBalance.findOne).toHaveBeenCalled();
      expect(LeaveRequest.findAll).toHaveBeenCalled();
      expect(result.dbRemaining).toBe(10);
      expect(result.pendingDays).toBe(3);
      expect(result.effectiveRemaining).toBe(7);
    });

    it("should ignore requests that match the excludeRequestId", async () => {
       LeaveBalance.findOne.mockResolvedValue({
        getRemainingDays: () => 10
      });

      LeaveRequest.findAll.mockResolvedValue([
        { startDate: "2024-05-01", totalDays: 2 } // The other request was excluded by the query
      ]);

      const result = await validationService.getEffectiveRemainingDays(1, 1, "2024-07-01", 99);
      
      expect(LeaveRequest.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: { [Op.ne]: 99 }
        })
      }));
      expect(result.pendingDays).toBe(2);
      expect(result.effectiveRemaining).toBe(8);
    });

    it("should return null if balance not found", async () => {
      LeaveBalance.findOne.mockResolvedValue(null);
      const result = await validationService.getEffectiveRemainingDays(1, 1, "2024-07-01");
      expect(result).toBeNull();
    });
  });

  describe("validateVacationLeave (Quota Bypass Verification)", () => {
    beforeEach(() => {
      LeaveType.findByPk.mockResolvedValue({ code: "vacation" });
    });

    it("should return valid:false if effective remaining days are exceeded", async () => {
      // Mock dbRemaining = 10, pendingDays = 8 (effective = 2)
      LeaveBalance.findOne.mockResolvedValue({ getRemainingDays: () => 10 });
      LeaveRequest.findAll.mockResolvedValue([{ startDate: "2024-05-01", totalDays: 8 }]);

      // Attempting to take 3 working days (which exceeds the 2 effective remaining)
      const leaveData = {
        userId: 1,
        leaveTypeId: 1,
        startDate: "2024-08-01",
        endDate: "2024-08-05", // 5 total days, 3 working days
        timeSlot: "full"
      };

      const result = await validationService.validateLeaveRequest(leaveData);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain("สิทธิ์ลาพักผ่อนคงเหลือ 2 วันทำการ (รออนุมัติ 8 วัน)");
    });

    it("should return valid:true if effective remaining days are sufficient", async () => {
      // Mock dbRemaining = 10, pendingDays = 8 (effective = 2)
      LeaveBalance.findOne.mockResolvedValue({ getRemainingDays: () => 10 });
      LeaveRequest.findAll.mockResolvedValue([{ startDate: "2024-05-01", totalDays: 8 }]);

      // Attempting to take 2 working days (exactly matches effective remaining)
      const leaveData = {
        userId: 1,
        leaveTypeId: 1,
        startDate: "2024-08-01",
        endDate: "2024-08-02", // 2 working days
        timeSlot: "full"
      };

      const result = await validationService.validateLeaveRequest(leaveData);
      
      expect(result.valid).toBe(true);
    });
  });
});
