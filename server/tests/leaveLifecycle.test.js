const {
  LeaveLifecycle,
  LifecycleError,
} = require("../services/leaveLifecycleService");
const {
  LeaveRequest,
  User,
  LeaveBalance,
  LeaveHistory,
  LeaveAttachment,
  LeaveType,
  Department,
  Faculty,
  Notification,
} = require("../models");
const { validateLeaveRequest, getFiscalYear } = require("../services/leaveValidationService");
const n8nService = require("../services/n8nService");
const {
  queueLeaveRequestEmails,
  queueApprovalEmail,
  queueLeaveApprovedAdminNotificationEmails,
  queueLeaveCancellationEmail,
  queueLeaveCancellationEmails,
} = require("../services/emailService");
const { sequelize } = require("../config/database");

// Mock dependencies
jest.mock("../models", () => ({
  LeaveRequest: {
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  User: {
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn(),
  },
  LeaveBalance: {
    increment: jest.fn(),
    decrement: jest.fn(),
    findOne: jest.fn(),
  },
  LeaveAttachment: {
    create: jest.fn(),
  },
  LeaveType: {
    findOne: jest.fn(),
  },
  Department: {
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn().mockResolvedValue(null),
  },
  Faculty: {
    findAll: jest.fn().mockResolvedValue([]),
    findByPk: jest.fn().mockResolvedValue(null),
  },
  Notification: {
    create: jest.fn().mockResolvedValue({ id: 1 }),
  },
  LeaveHistory: {
    create: jest.fn().mockResolvedValue({ id: 1 }),
  },
}));

jest.mock("../services/leaveValidationService", () => ({
  validateLeaveRequest: jest.fn(),
  getFiscalYear: jest.fn().mockReturnValue(2025),
}));

jest.mock("../services/emailService", () => ({
  queueLeaveRequestEmails: jest.fn().mockResolvedValue([]),
  queueApprovalEmail: jest.fn().mockResolvedValue({ id: "job-1" }),
  queueLeaveApprovedAdminNotificationEmails: jest.fn().mockResolvedValue([]),
  queueLeaveCancellationEmail: jest.fn().mockResolvedValue({ id: "job-cancel" }),
  queueLeaveCancellationEmails: jest.fn().mockResolvedValue([]),
}));

jest.mock("../services/n8nService", () => ({
  triggerNewLeaveWebhook: jest.fn(),
  triggerLeaveStatusWebhook: jest.fn(),
}));

jest.mock("../config/database", () => ({
  sequelize: {
    transaction: jest.fn().mockImplementation(() =>
      Promise.resolve({
        commit: jest.fn().mockResolvedValue(true),
        rollback: jest.fn().mockResolvedValue(true),
        finished: false,
      })
    ),
  },
}));

describe("LeaveLifecycle Deep Module", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    const actor = {
      id: 10,
      firstName: "Somchai",
      lastName: "Dee",
      email: "somchai@bru.ac.th",
      departmentId: 2,
      role: "employee",
    };

    it("should successfully create a leave request with history, balance locking and notifications", async () => {
      validateLeaveRequest.mockResolvedValue({
        valid: true,
        workingDays: 3,
        totalDays: 3,
        countWorkingDaysOnly: true,
      });

      const mockCreated = {
        id: 101,
        userId: 10,
        leaveTypeId: 1,
        totalDays: 3,
        status: "pending",
        user: actor,
        leaveType: { id: 1, name: "ลาป่วย", code: "sick" },
        attachments: [],
        update: jest.fn(),
      };

      LeaveRequest.create.mockResolvedValue(mockCreated);
      LeaveRequest.findByPk.mockResolvedValue(mockCreated);

      const result = await LeaveLifecycle.create(
        {
          leaveTypeId: 1,
          startDate: "2025-03-01",
          endDate: "2025-03-03",
          reason: "ป่วยเป็นไข้หวัด",
        },
        actor
      );

      expect(validateLeaveRequest).toHaveBeenCalled();
      expect(LeaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 10,
          leaveTypeId: 1,
          totalDays: 3,
          reason: "ป่วยเป็นไข้หวัด",
        }),
        expect.any(Object)
      );
      expect(LeaveHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leaveRequestId: 101,
          action: "created",
          actionBy: 10,
          newStatus: "pending",
        }),
        expect.any(Object)
      );
      expect(result.id).toBe(101);
    });

    it("should rollback and throw LifecycleError if business validation fails", async () => {
      validateLeaveRequest.mockResolvedValue({
        valid: false,
        message: "วันลาคงเหลือไม่เพียงพอ",
      });

      await expect(
        LeaveLifecycle.create(
          {
            leaveTypeId: 1,
            startDate: "2025-03-01",
            endDate: "2025-03-10",
          },
          actor
        )
      ).rejects.toThrow("วันลาคงเหลือไม่เพียงพอ");
    });

    it("should notify VP when dean creates leave request directly to pending_vp", async () => {
      validateLeaveRequest.mockResolvedValue({
        valid: true,
        workingDays: 2,
        totalDays: 2,
        countWorkingDaysOnly: true,
      });

      const deanActor = {
        id: 70,
        firstName: "Kittisak",
        lastName: "Dean",
        email: "dean@bru.ac.th",
        departmentId: 5,
        role: "dean",
      };

      const mockDeanCreated = {
        id: 102,
        userId: 70,
        leaveTypeId: 1,
        status: "pending_vp",
        totalDays: 2,
        leaveType: { name: "ลาพักผ่อน" },
        user: { ...deanActor, department: { id: 5, facultyId: 1 } },
      };
      LeaveRequest.findByPk.mockResolvedValue(mockDeanCreated);
      LeaveRequest.create.mockResolvedValue(mockDeanCreated);

      const mockVps = [{ id: 80, role: "vp" }];
      User.findAll.mockImplementation((query) => {
        if (query?.where?.role === "vp") return Promise.resolve(mockVps);
        if (query?.where?.role === "admin") return Promise.resolve([{ id: 1, role: "admin" }]);
        return Promise.resolve([]);
      });

      await LeaveLifecycle.create(
        {
          leaveTypeId: 1,
          startDate: "2025-04-01",
          endDate: "2025-04-02",
          reason: "ไปราชการ/ลาพักผ่อน",
        },
        deanActor
      );

      expect(LeaveRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 70,
          status: "pending_vp",
        }),
        expect.any(Object)
      );

      // Notification should be sent to VP
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 80,
          type: "new_leave",
          title: "มีใบลาใหม่รอคำสั่งรองอธิการบดีฯ",
        })
      );
    });
  });

  describe("transition('approve')", () => {
    it("should allow supervisor of same department to approve pending request", async () => {
      const mockRequest = {
        id: 50,
        userId: 20,
        status: "pending",
        totalDays: 2,
        user: { id: 20, departmentId: 5, firstName: "A", lastName: "B" },
        leaveType: { name: "ลากิจ" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const head = { id: 99, role: "head", departmentId: 5 };
      const result = await LeaveLifecycle.transition(50, "approve", head, { note: "อนุมัติครับ" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending_dean",
          headApprovedBy: 99,
        }),
        expect.any(Object)
      );
      expect(LeaveHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          leaveRequestId: 50,
          action: "approved",
          actionBy: 99,
          newStatus: "pending_dean",
        }),
        expect.any(Object)
      );
    });

    it("should allow dean to approve pending_dean request to pending_vp", async () => {
      const mockRequest = {
        id: 50,
        userId: 20,
        status: "pending_dean",
        totalDays: 2,
        user: { id: 20, department: { id: 5, facultyId: 2 } },
        leaveType: { name: "ลาพักผ่อน" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const dean = { id: 77, role: "dean", department: { id: 10, facultyId: 2 } };
      await LeaveLifecycle.transition(50, "approve", dean, { note: "เห็นชอบ" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending_vp",
          deanApprovedBy: 77,
        }),
        expect.any(Object)
      );
    });

    it("should allow vp to issue command on pending_vp request to approved", async () => {
      const mockRequest = {
        id: 50,
        userId: 20,
        status: "pending_vp",
        totalDays: 2,
        user: { id: 20, department: { id: 5, facultyId: 2 } },
        leaveType: { name: "ลาพักผ่อน" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const vp = { id: 66, role: "vp" };
      await LeaveLifecycle.transition(50, "approve", vp, { note: "อนุญาต", decision: "allow" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "approved",
          vpDecision: "allow",
          vpApprovedBy: 66,
        }),
        expect.any(Object)
      );
    });

    it("should deny self-approval by non-admin", async () => {
      const mockRequest = {
        id: 51,
        userId: 99, // Same as actor
        status: "pending",
        user: { id: 99, departmentId: 5 },
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const head = { id: 99, role: "head", departmentId: 5 };
      await expect(
        LeaveLifecycle.transition(51, "approve", head)
      ).rejects.toThrow("ไม่อนุญาตให้อนุมัติใบลาของตนเอง");
    });

    it("should deny approval by head from different department", async () => {
      const mockRequest = {
        id: 52,
        userId: 30,
        status: "pending",
        user: { id: 30, departmentId: 5 },
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const foreignHead = { id: 88, role: "head", departmentId: 9 };
      await expect(
        LeaveLifecycle.transition(52, "approve", foreignHead)
      ).rejects.toThrow("ไม่มีสิทธิ์อนุมัติใบลาของบุคลากรต่างแผนก/สาขาวิชา");
    });

    it("should isolate dean notifications to matching faculty when status moves to pending_dean", async () => {
      const mockRequest = {
        id: 55,
        userId: 25,
        status: "pending",
        totalDays: 3,
        user: {
          id: 25,
          departmentId: 10,
          firstName: "Somsri",
          lastName: "Staff",
          department: { id: 10, facultyId: 2 },
        },
        leaveType: { name: "ลาป่วย" },
        update: jest.fn().mockImplementation(function (data) {
          Object.assign(this, data);
          return Promise.resolve(this);
        }),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      // Department in Faculty 2
      Department.findAll.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      // Deans in Faculty 2
      const scienceDeans = [{ id: 72, role: "dean", departmentId: 10 }];
      User.findAll.mockImplementation((query) => {
        if (query?.where?.role === "dean") return Promise.resolve(scienceDeans);
        return Promise.resolve([]);
      });

      const head = { id: 95, role: "head", departmentId: 10 };
      await LeaveLifecycle.transition(55, "approve", head, { note: "เห็นควรอนุมัติ" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending_dean",
        }),
        expect.any(Object)
      );

      expect(Department.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { facultyId: 2 },
        })
      );
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 72,
          type: "new_leave",
          title: "มีใบลาใหม่รอความเห็นคณบดี/ผอ.สำนัก",
        })
      );
    });
  });

  describe("transition('reject')", () => {
    it("should reject pending request with reason", async () => {
      const mockRequest = {
        id: 60,
        userId: 20,
        status: "pending",
        totalDays: 2,
        user: { id: 20, departmentId: 5, email: "user20@example.com" },
        leaveType: { name: "ลาพักผ่อน" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const head = { id: 99, role: "head", departmentId: 5 };
      await LeaveLifecycle.transition(60, "reject", head, { reason: "งานด่วนไม่สามารถลาได้" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "rejected",
          approvedBy: 99,
          rejectionReason: "งานด่วนไม่สามารถลาได้",
        }),
        expect.any(Object)
      );
      expect(LeaveHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "rejected",
          note: "งานด่วนไม่สามารถลาได้",
        }),
        expect.any(Object)
      );
      expect(queueApprovalEmail).toHaveBeenCalledWith(
        mockRequest.user,
        mockRequest,
        false,
        "งานด่วนไม่สามารถลาได้",
        "rejected"
      );
    });

    it("should throw error if reason is missing", async () => {
      const mockRequest = { id: 61, status: "pending", user: { departmentId: 5 } };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const head = { id: 99, role: "head", departmentId: 5 };
      await expect(
        LeaveLifecycle.transition(61, "reject", head, {})
      ).rejects.toThrow("กรุณาระบุเหตุผลการปฏิเสธ");
    });
  });

  describe("transition('confirm')", () => {
    it("should deduct leave balance and confirm approved request", async () => {
      const mockRequest = {
        id: 70,
        userId: 20,
        leaveTypeId: 3,
        startDate: "2025-04-10",
        totalDays: 2.5,
        status: "approved",
        user: { id: 20, firstName: "Somchai", email: "somchai@bru.ac.th" },
        leaveType: { name: "ลาพักผ่อน" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);
      getFiscalYear.mockReturnValue(2025);

      const admin = { id: 1, role: "admin" };
      await LeaveLifecycle.transition(70, "confirm", admin, { note: "ลงบันทึกในระบบแล้ว" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "confirmed",
          confirmedBy: 1,
          confirmedNote: "ลงบันทึกในระบบแล้ว",
        }),
        expect.any(Object)
      );
      expect(LeaveBalance.increment).toHaveBeenCalledWith(
        "usedDays",
        expect.objectContaining({
          by: 2.5,
          where: {
            userId: 20,
            leaveTypeId: 3,
            year: 2025,
          },
        })
      );
      expect(LeaveHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "confirmed",
          actionBy: 1,
        }),
        expect.any(Object)
      );
      expect(queueApprovalEmail).toHaveBeenCalledWith(
        mockRequest.user,
        mockRequest,
        true,
        "ลงบันทึกในระบบแล้ว",
        "confirmed"
      );
    });

    it("should reject confirm if request is still pending", async () => {
      const mockRequest = { id: 71, status: "pending" };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const admin = { id: 1, role: "admin" };
      await expect(
        LeaveLifecycle.transition(71, "confirm", admin)
      ).rejects.toThrow("สามารถยืนยันใบลาได้เฉพาะใบที่ผ่านการอนุมัติ");
    });
  });

  describe("transition('cancel')", () => {
    it("should cancel confirmed request and restore leave balance", async () => {
      const mockRequest = {
        id: 80,
        userId: 20,
        leaveTypeId: 2,
        startDate: "2025-05-01",
        totalDays: 3,
        status: "confirmed",
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);
      getFiscalYear.mockReturnValue(2025);

      const owner = { id: 20, role: "employee" };
      await LeaveLifecycle.transition(80, "cancel", owner, { reason: "ขอยกเลิกเนื่องจากติดภารกิจ" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "cancelled",
          cancelReason: "ขอยกเลิกเนื่องจากติดภารกิจ",
        }),
        expect.any(Object)
      );
      expect(LeaveBalance.decrement).toHaveBeenCalledWith(
        "usedDays",
        expect.objectContaining({
          by: 3,
          where: {
            userId: 20,
            leaveTypeId: 2,
            year: 2025,
          },
        })
      );
      expect(LeaveHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "cancelled",
          actionBy: 20,
          oldStatus: "confirmed",
          newStatus: "cancelled",
        }),
        expect.any(Object)
      );
    });

    it("should cancel pending request without modifying balance", async () => {
      const mockRequest = {
        id: 81,
        userId: 20,
        leaveTypeId: 2,
        status: "pending",
        totalDays: 1,
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const owner = { id: 20, role: "employee" };
      await LeaveLifecycle.transition(81, "cancel", owner);

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "cancelled",
        }),
        expect.any(Object)
      );
      expect(LeaveBalance.decrement).not.toHaveBeenCalled();
    });

    it("should cancel pending_dean request without modifying balance", async () => {
      const mockRequest = {
        id: 82,
        userId: 20,
        leaveTypeId: 2,
        status: "pending_dean",
        totalDays: 2,
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const owner = { id: 20, role: "employee" };
      await LeaveLifecycle.transition(82, "cancel", owner, { reason: "ขอยกเลิกขณะรอคณบดี" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "cancelled",
          cancelReason: "ขอยกเลิกขณะรอคณบดี",
        }),
        expect.any(Object)
      );
      expect(LeaveBalance.decrement).not.toHaveBeenCalled();
      expect(LeaveHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "cancelled",
          actionBy: 20,
          oldStatus: "pending_dean",
          newStatus: "cancelled",
          note: "ขอยกเลิกขณะรอคณบดี",
        }),
        expect.any(Object)
      );
    });

    it("should cancel pending_vp request without modifying balance", async () => {
      const mockRequest = {
        id: 83,
        userId: 20,
        leaveTypeId: 2,
        status: "pending_vp",
        totalDays: 3,
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const owner = { id: 20, role: "employee" };
      await LeaveLifecycle.transition(83, "cancel", owner, { reason: "ขอยกเลิกขณะรอรองอธิการบดี" });

      expect(mockRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "cancelled",
          cancelReason: "ขอยกเลิกขณะรอรองอธิการบดี",
        }),
        expect.any(Object)
      );
      expect(LeaveBalance.decrement).not.toHaveBeenCalled();
      expect(LeaveHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "cancelled",
          actionBy: 20,
          oldStatus: "pending_vp",
          newStatus: "cancelled",
          note: "ขอยกเลิกขณะรอรองอธิการบดี",
        }),
        expect.any(Object)
      );
    });

    it("should reject cancel if request is already rejected", async () => {
      const mockRequest = {
        id: 84,
        userId: 20,
        status: "rejected",
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const owner = { id: 20, role: "employee" };
      await expect(
        LeaveLifecycle.transition(84, "cancel", owner)
      ).rejects.toThrow("ไม่สามารถยกเลิกใบลาในสถานะนี้ได้");
    });

    it("should send in-app cancellation notification to department head when pending leave is cancelled by employee", async () => {
      const mockRequest = {
        id: 85,
        userId: 20,
        leaveTypeId: 2,
        status: "pending",
        totalDays: 2,
        user: { id: 20, departmentId: 3, firstName: "Somchai", lastName: "Dee" },
        leaveType: { name: "ลากิจ" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const mockHeads = [{ id: 50, role: "head" }];
      User.findAll.mockImplementation((query) => {
        if (query?.where?.role === "head") return Promise.resolve(mockHeads);
        return Promise.resolve([]);
      });

      const employee = { id: 20, firstName: "Somchai", lastName: "Dee", role: "employee", departmentId: 3 };
      await LeaveLifecycle.transition(85, "cancel", employee, { reason: "ธุระยกเลิก" });

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 50,
          type: "cancellation",
          title: "ใบลาถูกยกเลิก",
          message: expect.stringContaining("ธุระยกเลิก"),
          relatedLeaveId: 85,
        })
      );
      expect(queueLeaveCancellationEmails).toHaveBeenCalledWith(
        mockHeads,
        expect.objectContaining({ id: 20 }),
        mockRequest,
        "ธุระยกเลิก"
      );
    });

    it("should send in-app cancellation notification to faculty dean when pending_dean leave is cancelled", async () => {
      const mockRequest = {
        id: 86,
        userId: 20,
        leaveTypeId: 2,
        status: "pending_dean",
        totalDays: 2,
        user: {
          id: 20,
          departmentId: 3,
          firstName: "Somchai",
          lastName: "Dee",
          department: { id: 3, facultyId: 4 },
        },
        leaveType: { name: "ลากิจ" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      Department.findAll.mockResolvedValue([{ id: 3 }]);
      const mockDeans = [{ id: 60, role: "dean", departmentId: 3 }];
      User.findAll.mockImplementation((query) => {
        if (query?.where?.role === "dean") return Promise.resolve(mockDeans);
        return Promise.resolve([]);
      });

      const employee = { id: 20, firstName: "Somchai", lastName: "Dee", role: "employee" };
      await LeaveLifecycle.transition(86, "cancel", employee, { reason: "ยกเลิกการลา" });

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 60,
          type: "cancellation",
          title: "ใบลาถูกยกเลิก",
          relatedLeaveId: 86,
        })
      );
      expect(queueLeaveCancellationEmails).toHaveBeenCalledWith(
        mockDeans,
        expect.objectContaining({ id: 20 }),
        mockRequest,
        "ยกเลิกการลา"
      );
    });

    it("should send in-app cancellation notification to VP when pending_vp leave is cancelled", async () => {
      const mockRequest = {
        id: 87,
        userId: 20,
        leaveTypeId: 2,
        status: "pending_vp",
        totalDays: 1,
        user: { id: 20, firstName: "Somchai", lastName: "Dee" },
        leaveType: { name: "ลาพักผ่อน" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const mockVps = [{ id: 70, role: "vp" }];
      User.findAll.mockImplementation((query) => {
        if (query?.where?.role === "vp") return Promise.resolve(mockVps);
        return Promise.resolve([]);
      });

      const employee = { id: 20, firstName: "Somchai", lastName: "Dee", role: "employee" };
      await LeaveLifecycle.transition(87, "cancel", employee);

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 70,
          type: "cancellation",
          title: "ใบลาถูกยกเลิก",
          relatedLeaveId: 87,
        })
      );
      expect(queueLeaveCancellationEmails).toHaveBeenCalledWith(
        mockVps,
        expect.objectContaining({ id: 20 }),
        mockRequest,
        undefined
      );
    });

    it("should notify employee when admin cancels on behalf of employee", async () => {
      const mockRequest = {
        id: 88,
        userId: 20,
        leaveTypeId: 2,
        status: "approved",
        totalDays: 2,
        user: { id: 20, firstName: "Somchai", lastName: "Dee", email: "somchai@bru.ac.th" },
        leaveType: { name: "ลาพักผ่อน" },
        update: jest.fn().mockResolvedValue(true),
      };
      LeaveRequest.findByPk.mockResolvedValue(mockRequest);

      const admin = { id: 1, firstName: "Admin", lastName: "User", role: "admin" };
      await LeaveLifecycle.transition(88, "cancel", admin, { reason: "เอกสารไม่สมบูรณ์" });

      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 20,
          type: "cancellation",
          title: "ใบลาของคุณถูกยกเลิกแล้ว",
          message: expect.stringContaining("เอกสารไม่สมบูรณ์"),
          relatedLeaveId: 88,
        })
      );
      expect(queueLeaveCancellationEmail).toHaveBeenCalledWith(
        mockRequest.user,
        mockRequest.user,
        mockRequest,
        "เอกสารไม่สมบูรณ์",
        true
      );
    });
  });
});

