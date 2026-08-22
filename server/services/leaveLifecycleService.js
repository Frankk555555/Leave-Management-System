const {
  LeaveRequest,
  User,
  LeaveBalance,
  LeaveAttachment,
  LeaveType,
  Department,
  Faculty,
  Notification,
  LeaveHistory,
} = require("../models");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const {
  validateLeaveRequest,
  getFiscalYear,
} = require("./leaveValidationService");
const {
  queueLeaveRequestEmails,
  queueApprovalEmail,
  queueLeaveApprovedAdminNotificationEmails,
} = require("./emailService");
const n8nService = require("./n8nService");
const sseService = require("./sseService");

class LifecycleError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "LifecycleError";
    this.statusCode = statusCode;
  }
}

/**
 * Helper: Find leave request by PK with standard user, leaveType, attachments, department associations
 */
const findLeaveRequestWithDetails = async (id, transaction = null) => {
  const options = {
    include: [
      {
        model: User,
        as: "user",
        attributes: [
          "id",
          "employeeId",
          "firstName",
          "lastName",
          "email",
          "position",
          "departmentId",
          "signatureImage",
        ],
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "name"],
            include: [
              {
                model: Faculty,
                as: "faculty",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      },
      {
        model: User,
        as: "approver",
        attributes: ["id", "firstName", "lastName"],
      },
      { model: LeaveType, as: "leaveType" },
      { model: LeaveAttachment, as: "attachments" },
    ],
  };
  if (transaction) {
    options.transaction = transaction;
  }
  return await LeaveRequest.findByPk(id, options);
};

/**
 * Deep Module: LeaveLifecycle
 * Encapsulates state transitions, balance adjustments, audit logging, concurrency locking, and outbound dispatching.
 */
const LeaveLifecycle = {
  /**
   * Create a new leave request with full transaction & validation encapsulation
   * @param {Object} payload Request body data
   * @param {Object} actor Authenticated user (req.user)
   * @param {Array} files Uploaded multer files (optional)
   * @returns {Promise<Object>} Created leave request
   */
  async create(payload, actor, files = []) {
    let {
      leaveTypeId,
      leaveType,
      startDate,
      endDate,
      reason,
      contactAddress,
      contactPhone,
      childBirthDate,
      ceremonyDate,
      hasMedicalCertificate,
      isLongTermSick,
      timeSlot,
    } = payload;

    const t = await sequelize.transaction();
    try {
      // Backward compatibility: resolve leaveType code if leaveTypeId not provided
      if (!leaveTypeId && leaveType) {
        const lt = await LeaveType.findOne({
          where: { code: leaveType },
          transaction: t,
        });
        if (!lt) {
          throw new LifecycleError(`ไม่พบประเภทลา: ${leaveType}`, 400);
        }
        leaveTypeId = lt.id;
      }

      if (!leaveTypeId) {
        throw new LifecycleError("กรุณาระบุประเภทการลา", 400);
      }

      // Validate business rules inside transaction with row lock
      const validation = await validateLeaveRequest(
        {
          userId: actor.id,
          leaveTypeId,
          startDate,
          endDate,
          childBirthDate,
          ceremonyDate,
          hasMedicalCertificate,
          isLongTermSick,
          timeSlot,
        },
        t
      );

      if (!validation.valid) {
        throw new LifecycleError(validation.message, 400);
      }

      const totalDays = validation.countWorkingDaysOnly
        ? validation.workingDays
        : validation.totalDays;

      // Create leave request record
      const leaveRequest = await LeaveRequest.create(
        {
          userId: actor.id,
          leaveTypeId,
          startDate,
          endDate,
          totalDays,
          timeSlot: timeSlot || "full",
          reason,
          contactAddress,
          contactPhone,
        },
        { transaction: t }
      );

      // Create audit trail
      await LeaveHistory.create(
        {
          leaveRequestId: leaveRequest.id,
          action: "created",
          actionBy: actor.id,
          oldStatus: null,
          newStatus: "pending",
        },
        { transaction: t }
      );

      // Handle file attachments
      if (files && files.length > 0) {
        const attachmentPromises = files.map((file) =>
          LeaveAttachment.create(
            {
              leaveRequestId: leaveRequest.id,
              fileName: file.filename || file.originalname,
              originalName: file.originalname,
              filePath:
                file.path && file.path.startsWith("http")
                  ? file.path
                  : "/" + file.path.replace(/\\/g, "/"),
              fileType: file.mimetype,
              fileSize: file.size,
            },
            { transaction: t }
          )
        );
        await Promise.all(attachmentPromises);
      }

      await t.commit();

      // Fetch created record with associations
      const createdRequest = await findLeaveRequestWithDetails(leaveRequest.id);

      // Post-commit dispatching (Non-blocking)
      this._dispatchPostCreateEvents(createdRequest, actor, validation.totalDays);

      return createdRequest;
    } catch (error) {
      if (!t.finished) {
        await t.rollback();
      }
      throw error;
    }
  },

  /**
   * Execute state transition on a leave request
   * @param {number|string} requestId ID of the leave request
   * @param {string} action Transition action ('approve' | 'reject' | 'confirm' | 'cancel' | 'edit')
   * @param {Object} actor Authenticated user executing the transition
   * @param {Object} options Extra parameters (reason, note, payload for edit)
   * @returns {Promise<Object>} Updated leave request
   */
  async transition(requestId, action, actor, options = {}) {
    const leaveRequest = await findLeaveRequestWithDetails(requestId);
    if (!leaveRequest) {
      throw new LifecycleError("ไม่พบใบลา", 404);
    }

    switch (action) {
      case "approve":
        return await this._handleApprove(leaveRequest, actor, options);
      case "reject":
        return await this._handleReject(leaveRequest, actor, options);
      case "confirm":
        return await this._handleConfirm(leaveRequest, actor, options);
      case "cancel":
        return await this._handleCancel(leaveRequest, actor, options);
      case "edit":
        return await this._handleEdit(leaveRequest, actor, options);
      default:
        throw new LifecycleError(`Invalid transition action: ${action}`, 400);
    }
  },

  /**
   * Internal: Approve transition
   */
  async _handleApprove(leaveRequest, actor, options) {
    if (leaveRequest.status !== "pending") {
      throw new LifecycleError("ใบลาไม่อยู่ในสถานะรอดำเนินการ", 400);
    }

    // Authorization & department isolation
    if (actor.role !== "admin") {
      if (leaveRequest.userId === actor.id) {
        throw new LifecycleError(
          "ไม่อนุญาตให้อนุมัติใบลาของตนเอง (กรุณาให้ผู้ดูแลระบบเป็นผู้อนุมัติ)",
          403
        );
      }

      const userDeptId =
        leaveRequest.user?.departmentId ||
        leaveRequest.user?.department?.id;
      if (!actor.departmentId || actor.departmentId !== userDeptId) {
        throw new LifecycleError(
          "ไม่มีสิทธิ์อนุมัติใบลาของบุคลากรต่างแผนก/สาขาวิชา",
          403
        );
      }
    }

    const oldStatus = leaveRequest.status;
    const t = await sequelize.transaction();

    try {
      await leaveRequest.update(
        {
          status: "approved",
          approvedBy: actor.id,
          approvedAt: new Date(),
        },
        { transaction: t }
      );

      await LeaveHistory.create(
        {
          leaveRequestId: leaveRequest.id,
          action: "approved",
          actionBy: actor.id,
          oldStatus,
          newStatus: "approved",
          note: options.note || null,
        },
        { transaction: t }
      );

      await t.commit();
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }

    // Post-commit dispatching
    this._dispatchPostApproveEvents(leaveRequest, actor, options.note);

    return leaveRequest;
  },

  /**
   * Internal: Reject transition
   */
  async _handleReject(leaveRequest, actor, options) {
    const { reason } = options;
    if (!reason) {
      throw new LifecycleError("กรุณาระบุเหตุผลการปฏิเสธ", 400);
    }

    if (leaveRequest.status !== "pending") {
      throw new LifecycleError("ใบลาไม่อยู่ในสถานะรอดำเนินการ", 400);
    }

    // Authorization & department isolation
    if (actor.role !== "admin") {
      if (leaveRequest.userId === actor.id) {
        throw new LifecycleError("ไม่อนุญาตให้ดำเนินการกับใบลาของตนเอง", 403);
      }

      const userDeptId =
        leaveRequest.user?.departmentId ||
        leaveRequest.user?.department?.id;
      if (!actor.departmentId || actor.departmentId !== userDeptId) {
        throw new LifecycleError(
          "ไม่มีสิทธิ์ปฏิเสธใบลาของบุคลากรต่างแผนก/สาขาวิชา",
          403
        );
      }
    }

    const oldStatus = leaveRequest.status;
    const t = await sequelize.transaction();

    try {
      await leaveRequest.update(
        {
          status: "rejected",
          approvedBy: actor.id,
          approvedAt: new Date(),
          rejectionReason: reason,
        },
        { transaction: t }
      );

      await LeaveHistory.create(
        {
          leaveRequestId: leaveRequest.id,
          action: "rejected",
          actionBy: actor.id,
          oldStatus,
          newStatus: "rejected",
          note: reason,
        },
        { transaction: t }
      );

      await t.commit();
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }

    // Post-commit dispatching
    this._dispatchPostRejectEvents(leaveRequest, reason);

    return leaveRequest;
  },

  /**
   * Internal: Confirm transition (Admin confirm & balance deduction)
   */
  async _handleConfirm(leaveRequest, actor, options) {
    if (leaveRequest.status === "confirmed") {
      throw new LifecycleError("ใบลานี้ถูกยืนยันแล้ว", 400);
    }

    if (leaveRequest.status !== "approved") {
      throw new LifecycleError(
        "สามารถยืนยันใบลาได้เฉพาะใบที่ผ่านการอนุมัติจากหัวหน้างานมาแล้วเท่านั้น",
        400
      );
    }

    const oldStatus = leaveRequest.status;
    const t = await sequelize.transaction();

    try {
      await leaveRequest.update(
        {
          status: "confirmed",
          confirmedBy: actor.id,
          confirmedAt: new Date(),
          confirmedNote: options.note || null,
        },
        { transaction: t }
      );

      // Deduct leave balance securely inside transaction
      const currentYear = getFiscalYear(leaveRequest.startDate);
      const totalDays = parseFloat(leaveRequest.totalDays);

      await LeaveBalance.increment("usedDays", {
        by: totalDays,
        where: {
          userId: leaveRequest.userId,
          leaveTypeId: leaveRequest.leaveTypeId,
          year: currentYear,
        },
        transaction: t,
      });

      console.log(
        `[LeaveLifecycle] Deducted ${totalDays} days of type ${leaveRequest.leaveTypeId} from user ${leaveRequest.userId}`
      );

      await LeaveHistory.create(
        {
          leaveRequestId: leaveRequest.id,
          action: "confirmed",
          actionBy: actor.id,
          oldStatus,
          newStatus: "confirmed",
          note: options.note || null,
        },
        { transaction: t }
      );

      await t.commit();
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }

    // Post-commit dispatching
    this._dispatchPostConfirmEvents(leaveRequest, options.note);

    return leaveRequest;
  },

  /**
   * Internal: Cancel transition (Soft cancel & balance restoration if confirmed)
   */
  async _handleCancel(leaveRequest, actor, options) {
    // Check ownership / admin authorization
    if (leaveRequest.userId !== actor.id && actor.role !== "admin") {
      throw new LifecycleError("Not authorized to cancel this request", 403);
    }

    const oldStatus = leaveRequest.status;
    const cancellableStatuses = ["pending", "approved", "confirmed"];
    if (!cancellableStatuses.includes(oldStatus)) {
      throw new LifecycleError("ไม่สามารถยกเลิกใบลาในสถานะนี้ได้", 400);
    }

    const t = await sequelize.transaction();

    try {
      await leaveRequest.update(
        {
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: options.reason || null,
        },
        { transaction: t }
      );

      // Restore leave balance if the request was previously confirmed
      if (oldStatus === "confirmed") {
        const currentYear = getFiscalYear(leaveRequest.startDate);
        const totalDays = parseFloat(leaveRequest.totalDays);

        await LeaveBalance.decrement("usedDays", {
          by: totalDays,
          where: {
            userId: leaveRequest.userId,
            leaveTypeId: leaveRequest.leaveTypeId,
            year: currentYear,
          },
          transaction: t,
        });

        console.log(
          `[LeaveLifecycle] Restored ${totalDays} days of type ${leaveRequest.leaveTypeId} to user ${leaveRequest.userId}`
        );
      }

      await LeaveHistory.create(
        {
          leaveRequestId: leaveRequest.id,
          action: "cancelled",
          actionBy: actor.id,
          oldStatus,
          newStatus: "cancelled",
          note: options.reason || null,
        },
        { transaction: t }
      );

      await t.commit();
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }

    return leaveRequest;
  },

  /**
   * Internal: Edit transition (Modify pending request)
   */
  async _handleEdit(leaveRequest, actor, options) {
    if (leaveRequest.userId !== actor.id && actor.role !== "admin") {
      throw new LifecycleError("Not authorized to update this request", 403);
    }

    if (leaveRequest.status !== "pending") {
      throw new LifecycleError(
        "ไม่สามารถแก้ไขใบลาที่ผ่านการดำเนินการไปแล้วได้",
        400
      );
    }

    let {
      leaveTypeId,
      leaveType,
      startDate,
      endDate,
      reason,
      childBirthDate,
      ceremonyDate,
      hasMedicalCertificate,
      isLongTermSick,
      timeSlot,
    } = options.payload || {};

    if (!leaveTypeId && leaveType) {
      const typeRecord = await LeaveType.findOne({ where: { code: leaveType } });
      if (typeRecord) leaveTypeId = typeRecord.id;
    }
    leaveTypeId = leaveTypeId || leaveRequest.leaveTypeId;

    const t = await sequelize.transaction();

    try {
      const validation = await validateLeaveRequest(
        {
          userId: actor.id,
          leaveTypeId,
          startDate,
          endDate,
          childBirthDate,
          ceremonyDate,
          hasMedicalCertificate,
          isLongTermSick,
          timeSlot,
          excludeRequestId: leaveRequest.id,
        },
        t
      );

      if (!validation.valid) {
        throw new LifecycleError(validation.message, 400);
      }

      const calculatedTotalDays = validation.countWorkingDaysOnly
        ? validation.workingDays
        : validation.totalDays;

      await leaveRequest.update(
        {
          leaveTypeId,
          startDate,
          endDate,
          totalDays: calculatedTotalDays,
          reason,
          timeSlot: timeSlot || leaveRequest.timeSlot,
        },
        { transaction: t }
      );

      await LeaveHistory.create(
        {
          leaveRequestId: leaveRequest.id,
          action: "edited",
          actionBy: actor.id,
          oldStatus: leaveRequest.status,
          newStatus: leaveRequest.status,
          note: "แก้ไขข้อมูลการลา",
        },
        { transaction: t }
      );

      await t.commit();
    } catch (err) {
      if (!t.finished) await t.rollback();
      throw err;
    }

    return leaveRequest;
  },

  /**
   * Post-commit Event Dispatchers
   */
  async _dispatchPostCreateEvents(createdRequest, actor, totalDays) {
    try {
      const leaveTypeName = createdRequest.leaveType?.name || "ลา";

      // 1. Notify Admins
      const admins = await User.findAll({
        where: { role: "admin", isActive: true },
      });
      const newLeavePayload = {
        type: "new_leave",
        title: "มีใบลาใหม่",
        message: `${actor.firstName} ${actor.lastName} ยื่นใบ${leaveTypeName} ${totalDays} วัน`,
        relatedLeaveId: createdRequest.id,
      };
      const adminNotifs = admins.map((admin) =>
        Notification.create({
          userId: admin.id,
          ...newLeavePayload,
        })
      );
      await Promise.all(adminNotifs);
      sseService.sendToUsers(
        admins.map((a) => a.id),
        "notification",
        newLeavePayload
      );

      // 2. Notify Department Heads
      if (actor.departmentId) {
        const heads = await User.findAll({
          where: {
            role: "head",
            departmentId: actor.departmentId,
            isActive: true,
          },
        });
        const headPayload = {
          type: "new_leave",
          title: "มีใบลาใหม่รออนุมัติ",
          message: `${actor.firstName} ${actor.lastName} ยื่นใบ${leaveTypeName} ${totalDays} วัน`,
          relatedLeaveId: createdRequest.id,
        };
        const headNotifs = heads.map((head) =>
          Notification.create({
            userId: head.id,
            ...headPayload,
          })
        );
        await Promise.all(headNotifs);
        sseService.sendToUsers(
          heads.map((h) => h.id),
          "notification",
          headPayload
        );
      }

      // 3. Trigger N8N Webhook
      if (n8nService && typeof n8nService.triggerNewLeaveWebhook === "function") {
        Promise.resolve(
          n8nService.triggerNewLeaveWebhook(
            createdRequest,
            actor,
            createdRequest.leaveType
          )
        ).catch((err) => console.error("Error triggering N8N webhook:", err));
      }
    } catch (notifyError) {
      console.error("[LeaveLifecycle] Post-create notify error:", notifyError);
    }
  },

  async _dispatchPostApproveEvents(leaveRequest, actor, note) {
    try {
      const leaveTypeName = leaveRequest.leaveType?.name || "ลา";

      // Notify employee
      const empPayload = {
        type: "approval",
        title: "ใบลาได้รับการอนุมัติแล้ว",
        message: `ใบ${leaveTypeName}ของคุณ (${leaveRequest.totalDays} วัน) ได้รับการอนุมัติโดยหัวหน้าสาขาแล้ว และกำลังรอแอดมินยืนยัน`,
        relatedLeaveId: leaveRequest.id,
      };
      await Notification.create({
        userId: leaveRequest.userId,
        ...empPayload,
      });
      sseService.sendToUser(leaveRequest.userId, "notification", empPayload);

      // Notify admins
      const admins = await User.findAll({
        where: { role: "admin", isActive: true },
      });
      const adminPayload = {
        type: "new_leave",
        title: "ใบลาผ่านการอนุมัติแล้ว",
        message: `ใบ${leaveTypeName}ของ ${leaveRequest.user?.firstName || ""} ${leaveRequest.user?.lastName || ""} ผ่านการอนุมัติจากหัวหน้าสาขาแล้ว รอการยืนยัน`,
        relatedLeaveId: leaveRequest.id,
      };
      const adminNotifs = admins.map((admin) =>
        Notification.create({
          userId: admin.id,
          ...adminPayload,
        })
      );
      await Promise.all(adminNotifs);
      sseService.sendToUsers(
        admins.map((a) => a.id),
        "notification",
        adminPayload
      );

      // Trigger N8N Webhook
      if (n8nService && typeof n8nService.triggerLeaveStatusWebhook === "function") {
        Promise.resolve(
          n8nService.triggerLeaveStatusWebhook(
            leaveRequest,
            leaveRequest.user,
            leaveRequest.leaveType,
            "approved",
            note
          )
        ).catch((err) => console.error("Error triggering N8N webhook:", err));
      }
    } catch (err) {
      console.error("[LeaveLifecycle] Post-approve notify error:", err);
    }
  },

  async _dispatchPostRejectEvents(leaveRequest, reason) {
    try {
      const leaveTypeName = leaveRequest.leaveType?.name || "ลา";
      const rejectPayload = {
        type: "rejection",
        title: "ใบลาถูกปฏิเสธ",
        message: `ใบ${leaveTypeName}ของคุณ (${leaveRequest.totalDays} วัน) ถูกปฏิเสธโดยหัวหน้าสาขาเนื่องจาก: ${reason}`,
        relatedLeaveId: leaveRequest.id,
      };

      await Notification.create({
        userId: leaveRequest.userId,
        ...rejectPayload,
      });
      sseService.sendToUser(leaveRequest.userId, "notification", rejectPayload);

      if (n8nService && typeof n8nService.triggerLeaveStatusWebhook === "function") {
        Promise.resolve(
          n8nService.triggerLeaveStatusWebhook(
            leaveRequest,
            leaveRequest.user,
            leaveRequest.leaveType,
            "rejected",
            reason
          )
        ).catch((err) => console.error("Error triggering N8N webhook:", err));
      }
    } catch (err) {
      console.error("[LeaveLifecycle] Post-reject notify error:", err);
    }
  },

  async _dispatchPostConfirmEvents(leaveRequest, note) {
    try {
      const leaveTypeName = leaveRequest.leaveType?.name || "ลา";
      const confirmPayload = {
        type: "confirmation",
        title: "ใบลาถูกลงข้อมูลแล้ว",
        message: `ใบ${leaveTypeName}ของคุณ (${leaveRequest.totalDays} วัน) ถูกลงข้อมูลในระบบมหาวิทยาลัยเรียบร้อยแล้ว${
          note ? " หมายเหตุ: " + note : ""
        }`,
        relatedLeaveId: leaveRequest.id,
      };

      await Notification.create({
        userId: leaveRequest.userId,
        ...confirmPayload,
      });
      sseService.sendToUser(leaveRequest.userId, "notification", confirmPayload);

      if (n8nService && typeof n8nService.triggerLeaveStatusWebhook === "function") {
        Promise.resolve(
          n8nService.triggerLeaveStatusWebhook(
            leaveRequest,
            leaveRequest.user,
            leaveRequest.leaveType,
            "confirmed",
            note
          )
        ).catch((err) => console.error("Error triggering N8N webhook:", err));
      }
    } catch (err) {
      console.error("[LeaveLifecycle] Post-confirm notify error:", err);
    }
  },
};

module.exports = {
  LeaveLifecycle,
  LifecycleError,
  findLeaveRequestWithDetails,
};
