const {
  getSupervisors,
  resetUserPassword,
  deleteUser,
  getUsers,
} = require("../controllers/userController");
const {
  User,
  LeaveRequest,
  LeaveBalance,
  Notification,
  LeaveHistory,
  LeaveAttachment,
} = require("../models");
const { Op } = require("sequelize");

jest.mock("../models", () => ({
  User: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    update: jest.fn(),
  },
  Department: {},
  LeaveBalance: {
    destroy: jest.fn(),
  },
  LeaveType: {},
  LeaveRequest: {
    update: jest.fn(),
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
  LeaveHistory: {
    destroy: jest.fn(),
  },
  Notification: {
    destroy: jest.fn(),
  },
  LeaveAttachment: {
    findAll: jest.fn(),
    destroy: jest.fn(),
  },
}));

jest.mock("../services/leaveValidationService", () => ({
  getFiscalYear: jest.fn().mockReturnValue(2024),
}));

jest.mock("../services/userIngestionService", () => ({
  UserIngestion: {},
  IngestionError: class IngestionError extends Error {},
  createLeaveBalancesForUser: jest.fn(),
}));

jest.mock("../config/cloudinary", () => ({
  uploader: {
    destroy: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("fs", () => ({
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync: jest.fn(),
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

  describe("getUsers (pagination)", () => {
    it("should call findAndCountAll with default page=1/limit=10 and respond with paginated shape", async () => {
      const mockUsers = [{ id: 1 }, { id: 2 }];
      User.findAndCountAll.mockResolvedValue({ count: 2, rows: mockUsers });

      const req = { query: {} };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getUsers(req, res);

      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 0 })
      );
      expect(res.json).toHaveBeenCalledWith({
        users: mockUsers,
        total: 2,
        page: 1,
        totalPages: 1,
      });
    });

    it("should respect page/limit query params", async () => {
      User.findAndCountAll.mockResolvedValue({ count: 25, rows: [] });

      const req = { query: { page: "3", limit: "10" } };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getUsers(req, res);

      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20 })
      );
      expect(res.json).toHaveBeenCalledWith({
        users: [],
        total: 25,
        page: 3,
        totalPages: 3,
      });
    });

    it("should handle errors with 500 status", async () => {
      User.findAndCountAll.mockRejectedValue(new Error("DB error"));

      const req = { query: {} };
      const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };

      await getUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Server error" })
      );
    });
  });

  describe("deleteUser (characterization)", () => {
    let req, res;

    beforeEach(() => {
      req = { params: { id: 7 } };
      res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    });

    it("should return 404 if user not found", async () => {
      User.findByPk.mockResolvedValue(null);

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
    });

    it("should delete user and all related records, then respond with success message", async () => {
      const mockUser = {
        id: 7,
        profileImage: "/uploads/profiles/a.png",
        signatureImage: "/uploads/signatures/b.png",
        destroy: jest.fn().mockResolvedValue(true),
      };
      User.findByPk.mockResolvedValue(mockUser);
      LeaveRequest.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      LeaveAttachment.findAll.mockResolvedValue([
        { filePath: "/uploads/leaves/x.pdf" },
        { filePath: "/uploads/leaves/y.pdf" },
      ]);

      await deleteUser(req, res);

      expect(LeaveRequest.update).toHaveBeenCalledWith(
        { approvedBy: null },
        { where: { approvedBy: 7 } }
      );
      expect(LeaveRequest.update).toHaveBeenCalledWith(
        { confirmedBy: null },
        { where: { confirmedBy: 7 } }
      );
      expect(LeaveBalance.destroy).toHaveBeenCalledWith({ where: { userId: 7 } });
      expect(Notification.destroy).toHaveBeenCalledWith({ where: { userId: 7 } });
      expect(LeaveHistory.destroy).toHaveBeenCalledWith({
        where: { leaveRequestId: [1, 2] },
      });
      expect(LeaveAttachment.destroy).toHaveBeenCalledWith({
        where: { leaveRequestId: [1, 2] },
      });
      expect(LeaveRequest.destroy).toHaveBeenCalledWith({ where: { userId: 7 } });
      expect(User.update).toHaveBeenCalledWith(
        { supervisorId: null },
        { where: { supervisorId: 7 } }
      );
      expect(mockUser.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "User removed" });
    });

    it("should handle errors with 500 status", async () => {
      User.findByPk.mockRejectedValue(new Error("DB error"));

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Server error" })
      );
    });
  });
});