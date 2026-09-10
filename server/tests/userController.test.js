const { getSupervisors } = require("../controllers/userController");
const { User } = require("../models");
const { Op } = require("sequelize");

jest.mock("../models", () => ({
  User: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Department: {},
  LeaveBalance: {},
  LeaveType: {},
  LeaveRequest: {},
  LeaveHistory: {},
  Notification: {},
}));

jest.mock("../services/leaveValidationService", () => ({
  getFiscalYear: jest.fn().mockReturnValue(2024),
}));

jest.mock("../services/userIngestionService", () => ({
  UserIngestion: {},
  IngestionError: class IngestionError extends Error {},
  createLeaveBalancesForUser: jest.fn(),
}));

describe("userController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSupervisors", () => {
    it("should query users with role in [head, dean, vp, admin] and active", async () => {
      const mockSupervisors = [
        {
          id: 1,
          employeeId: "VP001",
          firstName: "รองอธิการบดี",
          lastName: "ฝ่ายบุคคล",
          role: "vp",
          position: "รองอธิการบดี",
        },
        {
          id: 2,
          employeeId: "DEAN001",
          firstName: "คณบดี",
          lastName: "คณะวิทย์",
          role: "dean",
          position: "คณบดีคณะวิทยาศาสตร์",
        },
        {
          id: 3,
          employeeId: "HEAD001",
          firstName: "หัวหน้า",
          lastName: "สาขาคอม",
          role: "head",
          position: "หัวหน้าสาขาวิทยาการคอมพิวเตอร์",
        },
      ];

      User.findAll.mockResolvedValue(mockSupervisors);

      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getSupervisors(req, res);

      expect(User.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: { [Op.in]: ["head", "dean", "vp", "admin"] },
            isActive: true,
          },
          attributes: expect.arrayContaining(["id", "position", "role"]),
        })
      );

      expect(res.json).toHaveBeenCalledWith(mockSupervisors);
    });

    it("should handle errors with 500 status", async () => {
      User.findAll.mockRejectedValue(new Error("Database connection failed"));

      const req = {};
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await getSupervisors(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Server error",
        })
      );
    });
  });
});
