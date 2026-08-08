const { processEmailJob } = require("../queues/emailWorker");
const { JOB_TYPES } = require("../queues/queueTypes");
const emailService = require("../services/emailService");
const n8nService = require("../services/n8nService");

jest.mock("../services/emailService");
jest.mock("../services/n8nService");

describe("EmailWorker Job Processor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process EMAIL_LEAVE_REQUEST job", async () => {
    emailService.sendLeaveRequestEmail.mockResolvedValue(true);

    const job = {
      id: "job-1",
      name: JOB_TYPES.EMAIL_LEAVE_REQUEST,
      data: {
        supervisor: { email: "supervisor@example.com" },
        employee: { firstName: "John", lastName: "Doe" },
        leaveRequest: { id: 10, totalDays: 2 },
      },
    };

    const result = await processEmailJob(job);
    expect(result.success).toBe(true);
    expect(emailService.sendLeaveRequestEmail).toHaveBeenCalledWith(
      job.data.supervisor,
      job.data.employee,
      job.data.leaveRequest
    );
  });

  it("should process EMAIL_LEAVE_APPROVAL job", async () => {
    emailService.sendApprovalEmail.mockResolvedValue(true);

    const job = {
      id: "job-2",
      name: JOB_TYPES.EMAIL_LEAVE_APPROVAL,
      data: {
        employee: { email: "employee@example.com" },
        leaveRequest: { id: 10 },
        isApproved: true,
        note: "Approved by supervisor",
      },
    };

    const result = await processEmailJob(job);
    expect(result.success).toBe(true);
    expect(emailService.sendApprovalEmail).toHaveBeenCalledWith(
      job.data.employee,
      job.data.leaveRequest,
      true,
      "Approved by supervisor"
    );
  });

  it("should process EMAIL_ADMIN_PENDING_CONFIRMATION job", async () => {
    emailService.sendLeaveApprovedAdminNotificationEmail.mockResolvedValue(true);

    const job = {
      id: "job-3",
      name: JOB_TYPES.EMAIL_ADMIN_PENDING_CONFIRMATION,
      data: {
        admin: { email: "admin@example.com" },
        employee: { firstName: "Jane" },
        leaveRequest: { id: 15 },
      },
    };

    const result = await processEmailJob(job);
    expect(result.success).toBe(true);
    expect(emailService.sendLeaveApprovedAdminNotificationEmail).toHaveBeenCalledWith(
      job.data.admin,
      job.data.employee,
      job.data.leaveRequest
    );
  });

  it("should process EMAIL_PASSWORD_RESET job", async () => {
    emailService.sendPasswordResetEmail.mockResolvedValue(true);

    const job = {
      id: "job-4",
      name: JOB_TYPES.EMAIL_PASSWORD_RESET,
      data: {
        email: "user@example.com",
        resetUrl: "http://localhost:5173/reset-password?token=xyz",
      },
    };

    const result = await processEmailJob(job);
    expect(result.success).toBe(true);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      "user@example.com",
      "http://localhost:5173/reset-password?token=xyz"
    );
  });

  it("should process N8N_WEBHOOK_NEW_LEAVE job", async () => {
    n8nService.triggerNewLeaveWebhook.mockResolvedValue(true);

    const job = {
      id: "job-5",
      name: JOB_TYPES.N8N_WEBHOOK_NEW_LEAVE,
      data: {
        leaveRequest: { id: 20 },
        user: { id: 1 },
        leaveType: { name: "Sick" },
      },
    };

    const result = await processEmailJob(job);
    expect(result.success).toBe(true);
    expect(n8nService.triggerNewLeaveWebhook).toHaveBeenCalledWith(
      job.data.leaveRequest,
      job.data.user,
      job.data.leaveType
    );
  });

  it("should handle unknown job types safely", async () => {
    const job = {
      id: "job-unknown",
      name: "UNKNOWN_JOB_TYPE",
      data: {},
    };

    const result = await processEmailJob(job);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("unknown_job_type");
  });

  it("should propagate errors to trigger queue retries", async () => {
    emailService.sendNotificationEmail.mockRejectedValue(new Error("Network timeout"));

    const job = {
      id: "job-fail",
      name: JOB_TYPES.EMAIL_GENERIC,
      data: { to: "test@example.com", subject: "Hi", html: "<p>Hello</p>" },
    };

    await expect(processEmailJob(job)).rejects.toThrow("Network timeout");
  });
});
