const {
  UserIngestion,
  IngestionError,
} = require("../services/userIngestionService");
const { User, LeaveBalance, LeaveType, Department } = require("../models");
const axios = require("axios");

// Mock dependencies
jest.mock("../models", () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn(),
  },
  LeaveBalance: {
    findOrCreate: jest.fn().mockResolvedValue([{ id: 1 }, true]),
    upsert: jest.fn(),
  },
  LeaveType: {
    findAll: jest.fn().mockResolvedValue([
      { id: 1, name: "ลาป่วย", code: "sick", defaultDays: 60 },
      { id: 2, name: "ลากิจ", code: "personal", defaultDays: 45 },
    ]),
  },
  Department: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
  },
  Faculty: {
    findAll: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../services/leaveValidationService", () => ({
  getFiscalYear: jest.fn().mockReturnValue(2025),
}));

jest.mock("axios");

describe("UserIngestion Deep Module", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Security: isReadOnlySelectQuery", () => {
    it("should allow safe read-only SELECT queries", () => {
      expect(UserIngestion.isReadOnlySelectQuery("SELECT id, name FROM staff")).toBe(true);
      expect(UserIngestion.isReadOnlySelectQuery("  select * from employees where dept_id = 1")).toBe(true);
      expect(UserIngestion.isReadOnlySelectQuery("SELECT u.id, d.name FROM users u JOIN departments d ON u.dept_id = d.id")).toBe(true);
    });

    it("should reject non-SELECT queries", () => {
      expect(UserIngestion.isReadOnlySelectQuery("INSERT INTO users VALUES (1, 'Evil')")).toBe(false);
      expect(UserIngestion.isReadOnlySelectQuery("UPDATE users SET role = 'admin'")).toBe(false);
      expect(UserIngestion.isReadOnlySelectQuery("DELETE FROM users WHERE id = 1")).toBe(false);
      expect(UserIngestion.isReadOnlySelectQuery("DROP TABLE users")).toBe(false);
      expect(UserIngestion.isReadOnlySelectQuery("TRUNCATE TABLE users")).toBe(false);
    });

    it("should block single-statement file read/write attacks inside SELECT", () => {
      expect(UserIngestion.isReadOnlySelectQuery("SELECT * FROM users INTO OUTFILE '/var/www/shell.php'")).toBe(false);
      expect(UserIngestion.isReadOnlySelectQuery("SELECT * FROM users INTO DUMPFILE '/tmp/dump.txt'")).toBe(false);
      expect(UserIngestion.isReadOnlySelectQuery("SELECT LOAD_FILE('/etc/passwd')")).toBe(false);
    });
  });

  describe("Security: isSSRFSafeUrl", () => {
    it("should reject non-HTTP/HTTPS URLs", async () => {
      expect(await UserIngestion.isSSRFSafeUrl("ftp://example.com/users")).toBe(false);
      expect(await UserIngestion.isSSRFSafeUrl("file:///etc/passwd")).toBe(false);
      expect(await UserIngestion.isSSRFSafeUrl("javascript:alert(1)")).toBe(false);
    });

    it("should reject loopback and private IP URLs", async () => {
      expect(await UserIngestion.isSSRFSafeUrl("http://127.0.0.1:8080/api")).toBe(false);
      expect(await UserIngestion.isSSRFSafeUrl("http://localhost:3000/users")).toBe(false);
      expect(await UserIngestion.isSSRFSafeUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    });
  });

  describe("syncUsersList (Data Transformation & Normalization)", () => {
    const mapping = {
      employeeId: "emp_no",
      firstName: "f_name",
      lastName: "l_name",
      email: "email_addr",
      position: "pos",
      role: "role",
    };

    it("should create new user, seed leave balances, and auto-generate secure password", async () => {
      User.findOne.mockResolvedValue(null); // User does not exist
      User.create.mockResolvedValue({ id: 50, employeeId: "2568001" });

      const rows = [
        {
          emp_no: "2568001",
          f_name: "สมหญิง",
          l_name: "รักเรียน",
          email_addr: "somying@bru.ac.th",
          pos: "อาจารย์",
          role: "employee",
        },
      ];

      const result = await UserIngestion.syncUsersList(rows, mapping);

      expect(result.success.length).toBe(1);
      expect(result.failed.length).toBe(0);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: "2568001",
          firstName: "สมหญิง",
          lastName: "รักเรียน",
          email: "somying@bru.ac.th",
          position: "อาจารย์",
        })
      );
      expect(LeaveBalance.findOrCreate).toHaveBeenCalled();
    });

    it("should update existing user when email or employeeId matches", async () => {
      const mockExisting = {
        id: 10,
        email: "somchai@bru.ac.th",
        employeeId: "2568002",
        update: jest.fn().mockResolvedValue(true),
      };
      User.findOne.mockResolvedValue(mockExisting);

      const rows = [
        {
          emp_no: "2568002",
          f_name: "สมชาย",
          l_name: "ใจดี",
          email_addr: "somchai@bru.ac.th",
          pos: "หัวหน้าสาขาวิชา",
          role: "head",
        },
      ];

      const result = await UserIngestion.syncUsersList(rows, mapping);

      expect(result.success.length).toBe(1);
      expect(result.success[0].action).toBe("updated");
      expect(mockExisting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "สมชาย",
          lastName: "ใจดี",
          position: "หัวหน้าสาขาวิชา",
          role: "head",
        })
      );
    });

    it("should collect failed row if required fields are missing", async () => {
      const rows = [
        {
          emp_no: "2568003",
          f_name: "", // Missing firstName
          l_name: "ใจดี",
          email_addr: "", // Missing email
          pos: "อาจารย์",
        },
      ];

      const result = await UserIngestion.syncUsersList(rows, mapping);

      expect(result.success.length).toBe(0);
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].reason).toContain("ข้อมูลไม่ครบ");
    });
  });

  describe("API Sync: previewApiSync", () => {
    it("should fetch and preview columns and rows from external API", async () => {
      jest.spyOn(UserIngestion, "isSSRFSafeUrl").mockResolvedValue(true);

      axios.get.mockResolvedValue({
        data: [
          {
            emp_id: "UNI001",
            first_name: "กิตติพงษ์",
            last_name: "เจริญสุข",
            email: "kittipong@bru.ac.th",
          },
        ],
      });

      const preview = await UserIngestion.previewApiSync({
        url: "https://mock-university.bru.ac.th/api/staff",
      });

      expect(preview.columns).toEqual(["emp_id", "first_name", "last_name", "email"]);
      expect(preview.preview.length).toBe(1);
      expect(preview.message).toBe("เชื่อมต่อ API สำเร็จ");
    });

    it("should throw IngestionError on unsafe SSRF target", async () => {
      jest.spyOn(UserIngestion, "isSSRFSafeUrl").mockResolvedValue(false);

      await expect(
        UserIngestion.previewApiSync({ url: "http://127.0.0.1:5000/internal" })
      ).rejects.toThrow("ไม่อนุญาตให้เชื่อมต่อไปยัง URL ปลายทางที่ระบุ");
    });
  });
});
