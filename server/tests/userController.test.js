const { getSupervisors, resetUserPassword } = require("../controllers/userController");
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
  describe("resetUserPassword", () => {
    it("should successfully reset password with valid string password", async () => {
      const mockUser = {
        id: 5,
        password: "oldPasswordHash",
        save: jest.fn().mockResolvedValue(true),
      };
      User.findByPk.mockResolvedValue(mockUser);

      const req = {
        params: { id: 5 },
        body: { newPassword: "NewPassword123" },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await resetUserPassword(req, res);

      expect(mockUser.password).toBe("NewPassword123");
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "รีเซ็ตรหัสผ่านเรียบร้อยแล้ว" });
    });

    it("should handle nested object { newPassword: { newPassword: '...' } } without throwing trim error", async () => {
      const mockUser = {
        id: 5,
        password: "oldPasswordHash",
        save: jest.fn().mockResolvedValue(true),
      };
      User.findByPk.mockResolvedValue(mockUser);

      const req = {
        params: { id: 5 },
        body: { newPassword: { newPassword: "NewPassword123" } },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await resetUserPassword(req, res);

      expect(mockUser.password).toBe("NewPassword123");
      expect(mockUser.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "รีเซ็ตรหัสผ่านเรียบร้อยแล้ว" });
    });

    it("should reject password that is shorter than 8 chars", async () => {
      const mockUser = { id: 5 };
      User.findByPk.mockResolvedValue(mockUser);

      const req = {
        params: { id: 5 },
        body: { newPassword: "Pass1" },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await resetUserPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" })
      );
    });

    it("should reject password without both letters and numbers", async () => {
      const mockUser = { id: 5 };
      User.findByPk.mockResolvedValue(mockUser);

      const req = {
        params: { id: 5 },
        body: { newPassword: "onlyletters" },
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };

      await resetUserPassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว",
        })
      );
    });
  });
});