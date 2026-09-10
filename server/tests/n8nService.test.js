const {
  getStatusMetadata,
  triggerNewLeaveWebhook,
  triggerLeaveStatusWebhook,
} = require("../services/n8nService");

describe("n8nService", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.N8N_WEBHOOK_URL = "https://test-n8n.example.com/webhook";
    process.env.N8N_API_KEY = "test-n8n-key";
    process.env.FRONTEND_URL = "http://localhost:5173";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  describe("getStatusMetadata", () => {
    it("should return correct Thai label and step for pending (Step 1)", () => {
      const meta = getStatusMetadata("pending");
      expect(meta.statusLabel).toBe("รอหัวหน้างานพิจารณา");
      expect(meta.currentStep).toBe(1);
      expect(meta.totalSteps).toBe(3);
    });

    it("should return correct Thai label and step for pending_dean (Step 2)", () => {
      const meta = getStatusMetadata("pending_dean");
      expect(meta.statusLabel).toBe("รอคณบดีพิจารณา");
      expect(meta.currentStep).toBe(2);
      expect(meta.totalSteps).toBe(3);
    });

    it("should return correct Thai label and step for pending_vp (Step 3)", () => {
      const meta = getStatusMetadata("pending_vp");
      expect(meta.statusLabel).toBe("รอคำสั่งรองอธิการบดี");
      expect(meta.currentStep).toBe(3);
      expect(meta.totalSteps).toBe(3);
    });

    it("should return correct Thai label and step for approved", () => {
      const meta = getStatusMetadata("approved");
      expect(meta.statusLabel).toBe("อนุมัติแล้ว");
      expect(meta.currentStep).toBe(3);
      expect(meta.totalSteps).toBe(3);
    });

    it("should return correct Thai label and step for confirmed", () => {
      const meta = getStatusMetadata("confirmed");
      expect(meta.statusLabel).toBe("ลงข้อมูลในระบบเรียบร้อยแล้ว");
      expect(meta.currentStep).toBe(4);
    });

    it("should return correct Thai label and step for rejected", () => {
      const meta = getStatusMetadata("rejected");
      expect(meta.statusLabel).toBe("ไม่อนุมัติ");
      expect(meta.currentStep).toBe(0);
    });

    it("should return correct Thai label and step for cancelled", () => {
      const meta = getStatusMetadata("cancelled");
      expect(meta.statusLabel).toBe("ยกเลิกแล้ว");
      expect(meta.currentStep).toBe(0);
    });

    it("should provide safe fallback for unknown status", () => {
      const meta = getStatusMetadata("unknown_status");
      expect(meta.statusLabel).toBe("unknown_status");
      expect(meta.currentStep).toBe(0);
    });
  });

  describe("triggerNewLeaveWebhook", () => {
    it("should include statusLabel and currentStep in JSON payload", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const mockLeaveRequest = {
        id: 10,
        startDate: "2025-07-01",
        endDate: "2025-07-03",
        totalDays: 3,
        reason: "ไปทำธุระต่างจังหวัด",
        status: "pending",
      };
      const mockUser = {
        id: 5,
        firstName: "สมชาย",
        lastName: "ใจดี",
        email: "somchai@bru.ac.th",
        department: { name: "วิทยาการคอมพิวเตอร์" },
      };
      const mockLeaveType = {
        id: 2,
        name: "ลากิจส่วนตัว",
        code: "personal",
      };

      const result = await triggerNewLeaveWebhook(mockLeaveRequest, mockUser, mockLeaveType);
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe("https://test-n8n.example.com/webhook/leave-created");
      expect(options.headers["x-api-key"]).toBe("test-n8n-key");

      const body = JSON.parse(options.body);
      expect(body.event).toBe("leave_created");
      expect(body.status).toBe("pending");
      expect(body.statusLabel).toBe("รอหัวหน้างานพิจารณา");
      expect(body.currentStep).toBe(1);
      expect(body.totalSteps).toBe(3);
      expect(body.leaveRequest.statusLabel).toBe("รอหัวหน้างานพิจารณา");
      expect(body.leaveRequest.currentStep).toBe(1);
      expect(body.user.department).toBe("วิทยาการคอมพิวเตอร์");
    });

    it("should handle fetch error gracefully without throwing", async () => {
      global.fetch.mockRejectedValue(new Error("Network connection failed"));

      const result = await triggerNewLeaveWebhook({ id: 1 }, { id: 2 }, { name: "ป่วย" });
      expect(result).toBe(false);
    });
  });

  describe("triggerLeaveStatusWebhook", () => {
    it("should include statusLabel and currentStep for pending_dean", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const mockLeaveRequest = {
        id: 20,
        startDate: "2025-08-01",
        endDate: "2025-08-02",
        totalDays: 2,
        status: "pending_dean",
      };
      const mockUser = {
        id: 6,
        firstName: "สมหญิง",
        lastName: "รักเรียน",
        email: "somying@bru.ac.th",
        department: { name: "ฟิสิกส์" },
      };
      const mockLeaveType = {
        id: 1,
        name: "ลาป่วย",
        code: "sick",
      };

      const result = await triggerLeaveStatusWebhook(
        mockLeaveRequest,
        mockUser,
        mockLeaveType,
        "pending_dean",
        "หัวหน้างานเห็นควรอนุมัติ"
      );

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe("https://test-n8n.example.com/webhook/leave-status");

      const body = JSON.parse(options.body);
      expect(body.event).toBe("leave_status_updated");
      expect(body.status).toBe("pending_dean");
      expect(body.statusLabel).toBe("รอคณบดีพิจารณา");
      expect(body.currentStep).toBe(2);
      expect(body.totalSteps).toBe(3);
      expect(body.note).toBe("หัวหน้างานเห็นควรอนุมัติ");
      expect(body.leaveRequest.statusLabel).toBe("รอคณบดีพิจารณา");
      expect(body.leaveRequest.currentStep).toBe(2);
    });

    it("should include statusLabel and currentStep for pending_vp", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const mockLeaveRequest = { id: 25, totalDays: 3 };
      const mockUser = { id: 7, firstName: "อนันต์", lastName: "มั่นคง" };

      const result = await triggerLeaveStatusWebhook(
        mockLeaveRequest,
        mockUser,
        { name: "ลาพักผ่อน" },
        "pending_vp",
        "คณบดีเห็นชอบแล้ว"
      );

      expect(result).toBe(true);
      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.status).toBe("pending_vp");
      expect(body.statusLabel).toBe("รอคำสั่งรองอธิการบดี");
      expect(body.currentStep).toBe(3);
    });

    it("should include statusLabel and currentStep for confirmed", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const mockLeaveRequest = { id: 30, totalDays: 1 };
      const mockUser = { id: 8, firstName: "สมชาย" };

      const result = await triggerLeaveStatusWebhook(
        mockLeaveRequest,
        mockUser,
        { name: "ลาป่วย" },
        "confirmed",
        "ลงข้อมูลในระบบเรียบร้อยแล้ว"
      );

      expect(result).toBe(true);
      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.status).toBe("confirmed");
      expect(body.statusLabel).toBe("ลงข้อมูลในระบบเรียบร้อยแล้ว");
      expect(body.currentStep).toBe(4);
    });

    it("should include statusLabel and currentStep for cancelled", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const mockLeaveRequest = { id: 35, totalDays: 2 };
      const mockUser = { id: 9, firstName: "ประสิทธิ์" };

      const result = await triggerLeaveStatusWebhook(
        mockLeaveRequest,
        mockUser,
        { name: "ลากิจ" },
        "cancelled",
        "ติดภารกิจด่วน"
      );

      expect(result).toBe(true);
      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.status).toBe("cancelled");
      expect(body.statusLabel).toBe("ยกเลิกแล้ว");
      expect(body.currentStep).toBe(0);
    });

    it("should include nextApprover and nextApprovers in payload when provided", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const mockLeaveRequest = { id: 35, totalDays: 1, reason: "ไปหาหมอ" };
      const mockUser = { id: 1, firstName: "ณรงค์ชัย", lastName: "บุตรไทย", email: "narongchai@gmail.com" };
      const mockDeans = [
        { id: 16, firstName: "สมใจ", lastName: "ใยดี", email: "dean@bru.ac.th", role: "dean", position: "คณบดี" },
      ];

      const result = await triggerLeaveStatusWebhook(
        mockLeaveRequest,
        mockUser,
        { name: "ลาป่วย" },
        "pending_dean",
        "เห็นชอบ",
        mockDeans
      );

      expect(result).toBe(true);
      const [, options] = global.fetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.nextApprover).toEqual({
        id: 16,
        firstName: "สมใจ",
        lastName: "ใยดี",
        email: "dean@bru.ac.th",
        role: "dean",
        position: "คณบดี",
      });
      expect(body.nextApprovers).toHaveLength(1);
      expect(body.leaveRequest.reason).toBe("ไปหาหมอ");
    });

    it("should handle HTTP non-ok status code gracefully", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await triggerLeaveStatusWebhook(
        { id: 40 },
        { id: 10 },
        { name: "ลาป่วย" },
        "approved"
      );
      expect(result).toBe(false);
    });
  });
});
