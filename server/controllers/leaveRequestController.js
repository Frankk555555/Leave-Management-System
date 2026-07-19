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
  calculateWorkingDays,
  getFiscalYear,
} = require("../services/leaveValidationService");
const {
  sendLeaveRequestEmail,
  sendApprovalEmail,
  sendLeaveApprovedAdminNotificationEmail,
} = require("../services/emailService");
const n8nService = require("../services/n8nService");

// @desc    Create leave request
// @route   POST /api/leave-requests
// @access  Private
const createLeaveRequest = async (req, res) => {
  const t = await sequelize.transaction();
  try {
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
    } = req.body;

    // Backward compat: ถ้า frontend ส่ง leaveType (code) มาแทน leaveTypeId
    if (!leaveTypeId && leaveType) {
      const lt = await LeaveType.findOne({ where: { code: leaveType }, transaction: t });
      if (!lt) {
        await t.rollback();
        return res.status(400).json({ message: `ไม่พบประเภทลา: ${leaveType}` });
      }
      leaveTypeId = lt.id;
    }

    if (!leaveTypeId) {
      await t.rollback();
      return res.status(400).json({ message: "กรุณาระบุประเภทการลา" });
    }

    // Validate leave request with business rules (ภายใน transaction พร้อม row lock)
    const validation = await validateLeaveRequest({
      userId: req.user.id,
      leaveTypeId,
      startDate,
      endDate,
      childBirthDate,
      ceremonyDate,
      hasMedicalCertificate,
      isLongTermSick,
      timeSlot,
    }, t);

    if (!validation.valid) {
      await t.rollback();
      return res.status(400).json({ message: validation.message });
    }

    // Determine if paid leave
    const isPaidLeave = validation.isPaidLeave !== false;

    // Create leave request (ภายใน transaction เดียวกับการ validate)
    const leaveRequest = await LeaveRequest.create({
      userId: req.user.id,
      leaveTypeId,
      startDate,
      endDate,
      totalDays: validation.countWorkingDaysOnly ? validation.workingDays : validation.totalDays,
      timeSlot: timeSlot || "full",
      reason,
      contactAddress,
      contactPhone,
    }, { transaction: t });

    // Create audit trail
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      action: "created",
      actionBy: req.user.id,
      oldStatus: null,
      newStatus: "pending",
    }, { transaction: t });

    // Handle file uploads (create attachments)
    if (req.files && req.files.length > 0) {
      const attachmentPromises = req.files.map((file) =>
        LeaveAttachment.create({
          leaveRequestId: leaveRequest.id,
          fileName: file.filename || file.originalname,
          originalName: file.originalname,
          filePath: file.path && file.path.startsWith("http") 
            ? file.path 
            : "/" + file.path.replace(/\\/g, "/"),
          fileType: file.mimetype,
          fileSize: file.size,
        }, { transaction: t }),
      );
      await Promise.all(attachmentPromises);
    }

    // Commit transaction — ถึงจุดนี้ทุก write สำเร็จ
    await t.commit();

    // Fetch created request with associations (อยู่นอก transaction แล้ว)
    const createdRequest = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        { model: LeaveType, as: "leaveType" },
        { model: LeaveAttachment, as: "attachments" },
      ],
    });

    // Notify all admins and department heads about new leave request
    try {
      const leaveTypeName = createdRequest.leaveType?.name || "ลา";
      
      // 1. Notify admins
      const admins = await User.findAll({
        where: { role: "admin", isActive: true },
      });
      const notificationPromises = admins.map((admin) =>
        Notification.create({
          userId: admin.id,
          type: "new_leave",
          title: "มีใบลาใหม่",
          message: `${req.user.firstName} ${req.user.lastName} ยื่นใบ${leaveTypeName} ${validation.totalDays} วัน`,
          relatedLeaveId: leaveRequest.id,
        }),
      );
      await Promise.all(notificationPromises);

      // 2. Notify department head (if employee belongs to a department)
      let heads = [];
      if (req.user.departmentId) {
        heads = await User.findAll({
          where: {
            role: "head",
            departmentId: req.user.departmentId,
            isActive: true,
          },
        });
        const headNotificationPromises = heads.map((head) =>
          Notification.create({
            userId: head.id,
            type: "new_leave",
            title: "มีใบลาใหม่รออนุมัติ",
            message: `${req.user.firstName} ${req.user.lastName} ยื่นใบ${leaveTypeName} ${validation.totalDays} วัน`,
            relatedLeaveId: leaveRequest.id,
          }),
        );
        await Promise.all(headNotificationPromises);
      }

      // Send email to admins and department heads
      const adminEmailPromises = admins.map((admin) => 
        sendLeaveRequestEmail(admin, req.user, createdRequest)
      );
      
      const headEmailPromises = heads.map((head) => 
        sendLeaveRequestEmail(head, req.user, createdRequest)
      );
      
      await Promise.all([...adminEmailPromises, ...headEmailPromises]);
      
      // N8N: Trigger new leave webhook (1.4.5.1)
      await n8nService.triggerNewLeaveWebhook(createdRequest, req.user, createdRequest.leaveType);
    } catch (notifyError) {
      console.error("Error notifying admins and heads:", notifyError);
    }

    res.status(201).json(createdRequest);
  } catch (error) {
    // Rollback ถ้า transaction ยังไม่ได้ commit
    if (!t.finished) {
      await t.rollback();
    }
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Get my leave requests
// @route   GET /api/leave-requests
// @access  Private
const getMyLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: User,
          as: "approver",
          attributes: ["id", "firstName", "lastName"],
        },
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "signatureImage"],
        },
        { model: LeaveType, as: "leaveType" },
        { model: LeaveAttachment, as: "attachments" },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(leaveRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Get all leave requests (admin)
// @route   GET /api/leave-requests/all
// @access  Private/Admin
const getAllLeaveRequests = async (req, res) => {
  try {
    const leaveRequests = await LeaveRequest.findAll({
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
            "unit",
            "affiliation",
            "phone",
            "documentNumber",
            "signatureImage"
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
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(leaveRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Get leave request by ID
// @route   GET /api/leave-requests/:id
// @access  Private
const getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
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
            "unit",
            "affiliation",
            "phone",
            "documentNumber",
            "signatureImage",
          ],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name"],
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
        {
          model: LeaveHistory,
          as: "history",
          include: [
            {
              model: User,
              as: "actor",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
          order: [["createdAt", "ASC"]],
        },
      ],
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // IDOR Check
    const isOwner = leaveRequest.userId === req.user.id;
    const isAdmin = req.user.role === "admin";
    
    // ตรวจสอบว่าเป็นหัวหน้างานและอยู่แผนกเดียวกับเจ้าของใบลาหรือไม่
    const isHeadOfSameDepartment = 
      req.user.role === "head" && 
      leaveRequest.user && 
      leaveRequest.user.department && 
      leaveRequest.user.department.id === req.user.departmentId;

    if (!isOwner && !isAdmin && !isHeadOfSameDepartment) {
      return res.status(403).json({ message: "ไม่มีสิทธิ์เข้าถึงใบลานี้" });
    }

    res.json(leaveRequest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Cancel leave request (soft cancel)
// @route   PUT /api/leave-requests/:id/cancel
// @access  Private
const cancelLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Check ownership
    if (leaveRequest.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this request" });
    }

    const oldStatus = leaveRequest.status;

    // Check if cancellation is allowed
    const cancellableStatuses = ["pending", "approved", "confirmed"];
    if (!cancellableStatuses.includes(oldStatus)) {
      return res.status(400).json({
        message: "ไม่สามารถยกเลิกใบลาในสถานะนี้ได้",
      });
    }

    const t = await sequelize.transaction();

    try {
      // Soft cancel instead of destroy
      await leaveRequest.update({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: req.body.reason || null,
      }, { transaction: t });

      // Restore leave balance if the request was previously confirmed
      if (oldStatus === "confirmed") {
        const currentYear = getFiscalYear(leaveRequest.startDate);
        const totalDays = parseFloat(leaveRequest.totalDays);
        
        // Use optimistic locking or decrement via sequelize.literal inside transaction
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
          `Restored ${totalDays} days of type ${leaveRequest.leaveTypeId} to user ${leaveRequest.userId}`
        );
      }

      await t.commit();
    } catch (txError) {
      await t.rollback();
      throw txError;
    }

    // Audit trail
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      action: "cancelled",
      actionBy: req.user.id,
      oldStatus,
      newStatus: "cancelled",
      note: req.body.reason || null,
    });

    res.json({ message: "ยกเลิกการลาเรียบร้อยแล้ว", leaveRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Update leave request
// @route   PUT /api/leave-requests/:id
// @access  Private
const updateLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findByPk(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // Check ownership
    if (leaveRequest.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this request" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({
        message: "ไม่สามารถแก้ไขใบลาที่ผ่านการดำเนินการไปแล้วได้",
      });
    }

    let { leaveTypeId, leaveType, startDate, endDate, reason, childBirthDate, ceremonyDate, hasMedicalCertificate, isLongTermSick, timeSlot } = req.body;

    // Backward compat: ถ้า frontend ส่ง leaveType (code) มาแทน leaveTypeId
    if (!leaveTypeId && leaveType) {
      const typeRecord = await LeaveType.findOne({ where: { code: leaveType } });
      if (typeRecord) leaveTypeId = typeRecord.id;
    }

    // เริ่ม transaction เพื่อป้องกัน race condition ตอน validate + update
    const t = await sequelize.transaction();
    try {
      const validation = await validateLeaveRequest({
        userId: req.user.id,
        leaveTypeId: leaveTypeId,
        startDate,
        endDate,
        childBirthDate,
        ceremonyDate,
        hasMedicalCertificate,
        isLongTermSick,
        timeSlot,
        excludeRequestId: leaveRequest.id,
      }, t);

      if (!validation.valid) {
        await t.rollback();
        return res.status(400).json({ message: validation.message });
      }

      const calculatedTotalDays = validation.countWorkingDaysOnly ? validation.workingDays : validation.totalDays;

      await leaveRequest.update({
        leaveTypeId: leaveTypeId,
        startDate,
        endDate,
        totalDays: calculatedTotalDays,
        reason,
      }, { transaction: t });

      // Audit trail
      await LeaveHistory.create({
        leaveRequestId: leaveRequest.id,
        action: "edited",
        actionBy: req.user.id,
        oldStatus: leaveRequest.status,
        newStatus: leaveRequest.status,
        note: "แก้ไขข้อมูลการลา",
      }, { transaction: t });

      await t.commit();
    } catch (txError) {
      if (!t.finished) {
        await t.rollback();
      }
      throw txError;
    }

    res.json({ message: "อัปเดตบันทึกการลาเรียบร้อยแล้ว", leaveRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Get team leave requests (for team calendar)
// @route   GET /api/leave-requests/team
// @access  Private
const getTeamLeaveRequests = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Department,
          as: "department",
        },
      ],
    });

    // Get users in the same department or with same supervisor
    let teamWhere = {};

    if (user.supervisorId) {
      // Get colleagues with the same supervisor
      teamWhere = {
        [Op.or]: [
          { supervisorId: user.supervisorId },
          { id: user.supervisorId },
        ],
      };
    } else if (user.departmentId) {
      // Get users in the same department
      teamWhere = { departmentId: user.departmentId };
    }

    const teamMembers = await User.findAll({
      where: teamWhere,
      attributes: ["id"],
    });
    const teamIds = teamMembers.map((m) => m.id);

    const leaveRequests = await LeaveRequest.findAll({
      where: {
        userId: { [Op.in]: teamIds },
        status: "approved",
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName"],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name"],
            },
          ],
        },
        { model: LeaveType, as: "leaveType" },
      ],
      attributes: {
        exclude: [
          "reason",
          "rejectionReason",
          "contactAddress",
          "contactPhone",
        ],
      },
      order: [["startDate", "DESC"]],
    });

    res.json(leaveRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Confirm leave request (admin marks as processed in university system)
// @route   PUT /api/leave-requests/:id/confirm
// @access  Private/Admin
const confirmLeaveRequest = async (req, res) => {
  try {
    const { note } = req.body;
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        { model: LeaveType, as: "leaveType" },
      ],
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: "ไม่พบใบลา" });
    }

    if (leaveRequest.status === "confirmed") {
      return res.status(400).json({ message: "ใบลานี้ถูกยืนยันแล้ว" });
    }

    if (leaveRequest.status !== "approved") {
      return res.status(400).json({ message: "สามารถยืนยันใบลาได้เฉพาะใบที่ผ่านการอนุมัติจากหัวหน้างานมาแล้วเท่านั้น" });
    }

    const oldStatus = leaveRequest.status;

    const t = await sequelize.transaction();

    try {
      // Update status to confirmed
      await leaveRequest.update({
        status: "confirmed",
        confirmedBy: req.user.id,
        confirmedAt: new Date(),
        confirmedNote: note || null,
      }, { transaction: t });

      // Deduct leave balance securely
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
        `Deducted ${totalDays} days of type ${leaveRequest.leaveTypeId} from user ${leaveRequest.userId}`
      );

      await t.commit();
    } catch (txError) {
      await t.rollback();
      throw txError;
    }

    // Audit trail
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      action: "confirmed",
      actionBy: req.user.id,
      oldStatus,
      newStatus: "confirmed",
      note: note || null,
    });

    // Send notification to the user
    const leaveTypeName = leaveRequest.leaveType?.name || "ลา";
    await Notification.create({
      userId: leaveRequest.userId,
      type: "confirmation",
      title: "ใบลาถูกลงข้อมูลแล้ว",
      message: `ใบ${leaveTypeName}ของคุณ (${
        leaveRequest.totalDays
      } วัน) ถูกลงข้อมูลในระบบมหาวิทยาลัยเรียบร้อยแล้ว${
        note ? " หมายเหตุ: " + note : ""
      }`,
      relatedLeaveId: leaveRequest.id,
    });

    // Send email to user
    try {
      await sendApprovalEmail(
        leaveRequest.user,
        leaveRequest,
        true, // isApproved = true for confirmation
        note
      );

      // N8N: Trigger confirmed leave webhook (1.4.5.2)
      await n8nService.triggerLeaveStatusWebhook(leaveRequest, leaveRequest.user, leaveRequest.leaveType, "confirmed", note);
    } catch (emailError) {
      console.error("Error sending approval email:", emailError);
    }

    res.json({ message: "ยืนยันการลงข้อมูลเรียบร้อยแล้ว", leaveRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Get pending leave requests (for department heads)
// @route   GET /api/leave-requests/pending
// @access  Private/Supervisor
const getPendingLeaveRequests = async (req, res) => {
  try {
    const userDeptId = req.user.departmentId;
    let userWhere = {};

    // Admins can see pending requests from all departments, heads only see their own department
    if (req.user.role !== "admin") {
      if (!userDeptId) {
        return res.status(400).json({ message: "ผู้ใช้ไม่มีสังกัดหน่วยงาน ไม่สามารถอนุมัติใบลาได้" });
      }
      userWhere.departmentId = userDeptId;
    }

    const leaveRequests = await LeaveRequest.findAll({
      where: { status: "pending" },
      include: [
        {
          model: User,
          as: "user",
          where: userWhere,
          attributes: [
            "id",
            "employeeId",
            "firstName",
            "lastName",
            "position",
            "profileImage",
            "departmentId",
            "signatureImage"
          ],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name"],
            },
          ],
        },
        { model: LeaveType, as: "leaveType" },
        { model: LeaveAttachment, as: "attachments" },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json(leaveRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Approve leave request (department head)
// @route   PUT /api/leave-requests/:id/approve
// @access  Private/Supervisor
const approveLeaveRequest = async (req, res) => {
  try {
    const { note } = req.body;
    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name"],
            },
          ],
        },
        { model: LeaveType, as: "leaveType" },
      ],
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: "ไม่พบใบลา" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({ message: "ใบลาไม่อยู่ในสถานะรอดำเนินการ" });
    }

    const oldStatus = leaveRequest.status;

    // Update status to approved
    await leaveRequest.update({
      status: "approved",
      approvedBy: req.user.id,
      approvedAt: new Date(),
    });

    // Audit trail
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      action: "approved",
      actionBy: req.user.id,
      oldStatus,
      newStatus: "approved",
      note: note || null,
    });

    // Create notification for employee
    const leaveTypeName = leaveRequest.leaveType?.name || "ลา";
    await Notification.create({
      userId: leaveRequest.userId,
      type: "approval",
      title: "ใบลาได้รับการอนุมัติแล้ว",
      message: `ใบ${leaveTypeName}ของคุณ (${
        leaveRequest.totalDays
      } วัน) ได้รับการอนุมัติโดยหัวหน้าสาขาแล้ว และกำลังรอแอดมินยืนยัน`,
      relatedLeaveId: leaveRequest.id,
    });

    // Notify all admins about approved leave request waiting for confirmation
    try {
      const admins = await User.findAll({
        where: { role: "admin", isActive: true },
      });
      const adminNotificationPromises = admins.map((admin) =>
        Notification.create({
          userId: admin.id,
          type: "new_leave",
          title: "ใบลาผ่านการอนุมัติแล้ว",
          message: `ใบ${leaveTypeName}ของ ${leaveRequest.user?.firstName || ""} ${leaveRequest.user?.lastName || ""} ผ่านการอนุมัติจากหัวหน้าสาขาแล้ว รอการยืนยัน`,
          relatedLeaveId: leaveRequest.id,
        }),
      );
      await Promise.all(adminNotificationPromises);

      // Send email to admins
      const adminEmailPromises = admins.map((admin) =>
        sendLeaveApprovedAdminNotificationEmail(admin, leaveRequest.user, leaveRequest)
      );
      await Promise.all(adminEmailPromises);
    } catch (adminNotifyError) {
      console.error("Error notifying admins on approval:", adminNotifyError);
    }

    // Send email to user
    try {
      await sendApprovalEmail(
        leaveRequest.user,
        leaveRequest,
        true, // isApproved = true
        note
      );

      // N8N: Trigger approved leave webhook (1.4.5.2)
      await n8nService.triggerLeaveStatusWebhook(leaveRequest, leaveRequest.user, leaveRequest.leaveType, "approved", note);
    } catch (emailError) {
      console.error("Error sending approval email:", emailError);
    }

    res.json({ message: "อนุมัติคำขอลาเรียบร้อยแล้ว", leaveRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Reject leave request (department head)
// @route   PUT /api/leave-requests/:id/reject
// @access  Private/Supervisor
const rejectLeaveRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: "กรุณาระบุเหตุผลการปฏิเสธ" });
    }

    const leaveRequest = await LeaveRequest.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        { model: LeaveType, as: "leaveType" },
      ],
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: "ไม่พบใบลา" });
    }

    if (leaveRequest.status !== "pending") {
      return res.status(400).json({ message: "ใบลาไม่อยู่ในสถานะรอดำเนินการ" });
    }

    const oldStatus = leaveRequest.status;

    // Update status to rejected
    await leaveRequest.update({
      status: "rejected",
      approvedBy: req.user.id,
      approvedAt: new Date(),
      rejectionReason: reason,
    });

    // Audit trail
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      action: "rejected",
      actionBy: req.user.id,
      oldStatus,
      newStatus: "rejected",
      note: reason,
    });

    // Create notification for employee
    const leaveTypeName = leaveRequest.leaveType?.name || "ลา";
    await Notification.create({
      userId: leaveRequest.userId,
      type: "rejection",
      title: "ใบลาถูกปฏิเสธ",
      message: `ใบ${leaveTypeName}ของคุณ (${
        leaveRequest.totalDays
      } วัน) ถูกปฏิเสธโดยหัวหน้าสาขาเนื่องจาก: ${reason}`,
      relatedLeaveId: leaveRequest.id,
    });

    // Send email to user
    try {
      await sendApprovalEmail(
        leaveRequest.user,
        leaveRequest,
        false, // isApproved = false
        reason
      );

      // N8N: Trigger rejected leave webhook
      await n8nService.triggerLeaveStatusWebhook(leaveRequest, leaveRequest.user, leaveRequest.leaveType, "rejected", reason);
    } catch (emailError) {
      console.error("Error sending rejection email:", emailError);
    }

    res.json({ message: "ปฏิเสธคำขอลาเรียบร้อยแล้ว", leaveRequest });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

module.exports = {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  getLeaveRequestById,
  cancelLeaveRequest,
  updateLeaveRequest,
  getTeamLeaveRequests,
  confirmLeaveRequest,
  getPendingLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
};
