const cron = require("node-cron");
const {
  calculateYearsOfService,
  calculateAndCreateFiscalYearBalances,
} = require("../services/leaveBalanceService");
const { initFiscalYearCron } = require("../jobs/fiscalYearJob");

// Mock dependencies
jest.mock("node-cron", () => ({
  schedule: jest.fn().mockReturnValue({ stop: jest.fn(), start: jest.fn() }),
}));

jest.mock("../models", () => ({
  User: {
    findAll: jest.fn(),
  },
  LeaveType: {
    findAll: jest.fn(),
  },
  LeaveBalance: {
    findAll: jest.fn(),
    bulkCreate: jest.fn(),
    update: jest.fn(),
  },
  Notification: {
    bulkCreate: jest.fn(),
  },
}));

jest.mock("../services/leaveValidationService", () => ({
  getFiscalYear: jest.fn().mockReturnValue(2027),
}));

const { User, LeaveType, LeaveBalance, Notification } = require("../models");

describe("Fiscal Year Leave Balance Service & Job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ENABLE_CRON;
    delete process.env.FISCAL_YEAR_CRON_SCHEDULE;
    delete process.env.CRON_TIMEZONE;
  });

  describe("calculateYearsOfService", () => {
    it("should return 0 if startDate is null or invalid", () => {
      expect(calculateYearsOfService(null)).toBe(0);
      expect(calculateYearsOfService("invalid-date")).toBe(0);
    });

    it("should correctly calculate years of service", () => {
      const startDate = "2020-10-01";
      const asOfDate = new Date("2026-10-01");
      const years = calculateYearsOfService(startDate, asOfDate);
      expect(years).toBe(6);
    });

    it("should calculate 10+ years of service correctly", () => {
      const startDate = "2010-05-15";
      const asOfDate = new Date("2026-10-01");
      const years = calculateYearsOfService(startDate, asOfDate);
      expect(years).toBe(16);
    });
  });

  describe("calculateAndCreateFiscalYearBalances", () => {
    const mockLeaveTypes = [
      { id: 1, name: "ลาพักผ่อน", code: "vacation", defaultDays: 10 },
      { id: 2, name: "ลาป่วย", code: "sick", defaultDays: 60 },
      { id: 3, name: "ลากิจ", code: "personal", defaultDays: 45 },
    ];

    it("should cap carriedOverDays at 10 days for users with service < 10 years", async () => {
      // User with 3 years service (startDate: 2023-10-01 vs FY2027)
      const mockUsers = [
        {
          id: 101,
          employeeId: "EMP001",
          firstName: "Somchai",
          lastName: "Jaidee",
          startDate: "2023-10-01",
          role: "employee",
          isActive: true,
        },
      ];

      User.findAll
        .mockResolvedValueOnce(mockUsers) // Active users
        .mockResolvedValueOnce([]); // Admin/HR users for notification

      LeaveType.findAll.mockResolvedValueOnce(mockLeaveTypes);

      // Previous year (2026) balances: user has 15 remaining vacation days
      const mockPrevBalances = [
        {
          userId: 101,
          leaveTypeId: 1, // vacation
          totalDays: 10,
          usedDays: 0,
          carriedOverDays: 5,
          getRemainingDays: () => 15,
        },
      ];

      LeaveBalance.findAll
        .mockResolvedValueOnce(mockPrevBalances) // previous balances
        .mockResolvedValueOnce([]); // target balances (none exist yet)

      LeaveBalance.bulkCreate.mockResolvedValueOnce([]);

      const result = await calculateAndCreateFiscalYearBalances({
        targetYear: 2027,
        triggeredBy: "cron",
      });

      expect(result.success).toBe(true);
      expect(result.targetYear).toBe(2027);
      expect(result.previousYear).toBe(2026);
      expect(result.balancesCreated).toBe(3);

      expect(LeaveBalance.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 101,
            leaveTypeId: 1, // vacation
            year: 2027,
            totalDays: 10,
            usedDays: 0,
            carriedOverDays: 10, // Capped at 10 because service < 10 years
          }),
          expect.objectContaining({
            userId: 101,
            leaveTypeId: 2, // sick
            year: 2027,
            totalDays: 60,
            usedDays: 0,
            carriedOverDays: 0, // Sick leave does not carry over
          }),
        ])
      );
    });

    it("should allow up to 20 carriedOverDays for users with service >= 10 years", async () => {
      // User with 12 years service
      const mockUsers = [
        {
          id: 102,
          employeeId: "EMP002",
          firstName: "Wichai",
          lastName: "Rakchat",
          startDate: "2012-01-01",
          role: "employee",
          isActive: true,
        },
      ];

      User.findAll
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce([]);

      LeaveType.findAll.mockResolvedValueOnce(mockLeaveTypes);

      // Previous year balance: 25 remaining vacation days
      const mockPrevBalances = [
        {
          userId: 102,
          leaveTypeId: 1,
          totalDays: 10,
          usedDays: 0,
          carriedOverDays: 15,
          getRemainingDays: () => 25,
        },
      ];

      LeaveBalance.findAll
        .mockResolvedValueOnce(mockPrevBalances)
        .mockResolvedValueOnce([]);

      LeaveBalance.bulkCreate.mockResolvedValueOnce([]);

      const result = await calculateAndCreateFiscalYearBalances({
        targetYear: 2027,
        triggeredBy: "cron",
      });

      expect(result.balancesCreated).toBe(3);
      expect(LeaveBalance.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 102,
            leaveTypeId: 1, // vacation
            year: 2027,
            carriedOverDays: 20, // Capped at 20 because service >= 10 years
          }),
        ])
      );
    });

    it("should update existing unused balance and skip balance with usedDays > 0", async () => {
      const mockUsers = [
        {
          id: 103,
          employeeId: "EMP003",
          firstName: "Mana",
          lastName: "Dee",
          startDate: "2020-01-01",
          role: "employee",
          isActive: true,
        },
      ];

      User.findAll
        .mockResolvedValueOnce(mockUsers)
        .mockResolvedValueOnce([]);

      LeaveType.findAll.mockResolvedValueOnce([
        { id: 1, code: "vacation", defaultDays: 10 },
        { id: 2, code: "sick", defaultDays: 60 },
      ]);

      // Previous year balances
      LeaveBalance.findAll
        .mockResolvedValueOnce([
          {
            userId: 103,
            leaveTypeId: 1,
            getRemainingDays: () => 8,
          },
        ])
        // Target year balances already exist:
        // Vacation has usedDays = 0 (can update)
        // Sick has usedDays = 3 (must skip to protect usage history)
        .mockResolvedValueOnce([
          {
            id: 501,
            userId: 103,
            leaveTypeId: 1,
            usedDays: 0,
            carriedOverDays: 0,
          },
          {
            id: 502,
            userId: 103,
            leaveTypeId: 2,
            usedDays: 3,
            carriedOverDays: 0,
          },
        ]);

      LeaveBalance.update.mockResolvedValue([1]);

      const result = await calculateAndCreateFiscalYearBalances({
        targetYear: 2027,
        triggeredBy: "manual",
      });

      expect(result.balancesCreated).toBe(0);
      expect(result.balancesUpdated).toBe(1);
      expect(result.balancesSkipped).toBe(1);
      expect(LeaveBalance.update).toHaveBeenCalledWith(
        {
          totalDays: 10,
          carriedOverDays: 8,
        },
        { where: { id: 501 } }
      );
    });

    it("should send in-app notifications to admin and hr users", async () => {
      const mockUsers = [
        {
          id: 104,
          employeeId: "EMP004",
          firstName: "Anan",
          lastName: "Suk",
          startDate: "2021-01-01",
          role: "employee",
          isActive: true,
        },
      ];

      const mockAdmins = [{ id: 1 }, { id: 2 }];

      User.findAll
        .mockResolvedValueOnce(mockUsers) // Active users
        .mockResolvedValueOnce(mockAdmins); // Admin and HR users

      LeaveType.findAll.mockResolvedValueOnce([
        { id: 1, code: "vacation", defaultDays: 10 },
      ]);

      LeaveBalance.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      LeaveBalance.bulkCreate.mockResolvedValueOnce([]);
      Notification.bulkCreate.mockResolvedValueOnce([]);

      await calculateAndCreateFiscalYearBalances({ targetYear: 2027, triggeredBy: "cron" });

      expect(Notification.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 1,
            type: "reminder",
            title: expect.stringContaining("2027"),
            message: expect.stringContaining("Scheduled Job"),
          }),
          expect.objectContaining({
            userId: 2,
            type: "reminder",
            title: expect.stringContaining("2027"),
          }),
        ])
      );
    });
  });

  describe("initFiscalYearCron", () => {
    it("should schedule cron with 1 0 1 10 * and Asia/Bangkok by default", () => {
      initFiscalYearCron();

      expect(cron.schedule).toHaveBeenCalledWith(
        "1 0 1 10 *",
        expect.any(Function),
        expect.objectContaining({
          scheduled: true,
          timezone: "Asia/Bangkok",
        })
      );
    });

    it("should disable scheduling when ENABLE_CRON=false", () => {
      process.env.ENABLE_CRON = "false";
      const task = initFiscalYearCron();

      expect(task).toBeNull();
      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });
});
