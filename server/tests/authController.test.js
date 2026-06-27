const { login } = require("../controllers/authController");
const { User } = require("../models");
const jwt = require("jsonwebtoken");

jest.mock("../models", () => ({
  User: {
    findOne: jest.fn(),
  },
  LeaveBalance: {},
  LeaveType: {},
  Department: {},
  Faculty: {},
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mocked-jwt-token"),
}));

jest.mock("../services/leaveValidationService", () => ({
  getFiscalYear: jest.fn().mockReturnValue(2024),
}));

describe("authController", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("login", () => {
    let req, res;

    beforeEach(() => {
      req = {
        body: { email: "test@example.com", password: "password123" },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
    });

    it("should return 401 if user is not found", async () => {
      User.findOne.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    });

    it("should return 401 if user is found but NOT active", async () => {
      User.findOne.mockResolvedValue({ isActive: false });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "บัญชีนี้ถูกระงับการใช้งาน" });
    });

    it("should return 401 if password is invalid", async () => {
      User.findOne.mockResolvedValue({
        isActive: true,
        comparePassword: jest.fn().mockResolvedValue(false), // Password mismatch
      });

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    });

    it("should return 200 and a JWT token if credentials are valid", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
        isActive: true,
        firstName: "Test",
        lastName: "User",
        comparePassword: jest.fn().mockResolvedValue(true), // Password matches
      };
      User.findOne.mockResolvedValue(mockUser);

      await login(req, res);

      expect(mockUser.comparePassword).toHaveBeenCalledWith("password123");
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        email: "test@example.com",
        firstName: "Test",
        token: "mocked-jwt-token"
      }));
    });
  });
});
