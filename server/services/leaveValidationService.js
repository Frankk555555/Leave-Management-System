const { Op } = require("sequelize");
const { LeaveType, LeaveBalance, LeaveRequest, User, Holiday } = require("../models");

const WORKING_DAYS_ONLY_LEAVE_TYPES = [
  "vacation",
  "sick",
  "personal",
  "maternity",
  "paternity",
  "childcare",
];

const INCLUDE_HOLIDAYS_LEAVE_TYPES = ["ordination", "military"];

/**
 * Helper: คำนวณปีงบประมาณ
 */
const getFiscalYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth(); // 0-11
  const year = d.getFullYear();
  return month >= 9 ? year + 1 : year;
};

/**
 * Helper: คำนวณจำนวนวันทั้งหมด (รวมวันหยุด)
 */
const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Helper: คำนวณวันทำการ (ไม่รวมเสาร์-อาทิตย์ และวันหยุดนักขัตฤกษ์)
 */
const calculateWorkingDays = async (startDate, endDate) => {
  let count = 0;
  const curDate = new Date(startDate);
  const end = new Date(endDate);
  
  curDate.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  // ดึงข้อมูลวันหยุดนักขัตฤกษ์จาก Database
  const holidayRecords = await Holiday.findAll({
    where: {
      date: {
        [Op.between]: [curDate, end],
      },
    },
    attributes: ["date"],
  });
  const holidays = holidayRecords.map((h) => {
    const d = new Date(h.date);
    return d.toISOString().split("T")[0];
  });

  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateString = curDate.toISOString().split("T")[0];
    const isHoliday = holidays.includes(dateString);

    if (!isWeekend && !isHoliday) {
      count++;
    }
    curDate.setDate(curDate.getDate() + 1);
  }

  return count;
};

/**
 * Helper: ดึงข้อมูลยอดวันลาคงเหลือจาก LeaveBalance
 */
const getUserLeaveBalance = async (userId, leaveTypeId) => {
  const currentYear = getFiscalYear();
  
  return await LeaveBalance.findOne({
    where: {
      userId,
      leaveTypeId,
      year: currentYear,
    },
  });
};

/**
 * Helper: คำนวณวันลาคงเหลือที่แท้จริง โดยหักลบยอดรออนุมัติ
 */
const getEffectiveRemainingDays = async (userId, leaveTypeId, startDate, excludeRequestId = null, transaction = null) => {
  const currentYear = getFiscalYear(startDate);

  // ใช้ SELECT ... FOR UPDATE เมื่ออยู่ใน transaction เพื่อป้องกัน race condition
  const findOptions = {
    where: {
      userId,
      leaveTypeId,
      year: currentYear,
    },
  };
  if (transaction) {
    findOptions.transaction = transaction;
    findOptions.lock = transaction.LOCK.UPDATE;
  }
  const balance = await LeaveBalance.findOne(findOptions);

  if (!balance) return null;

  const dbRemaining = balance.getRemainingDays();

  const whereClause = {
    userId,
    leaveTypeId,
    status: {
      [Op.in]: ["pending", "approved"]
    }
  };

  if (excludeRequestId) {
    whereClause.id = { [Op.ne]: excludeRequestId };
  }

  const requests = await LeaveRequest.findAll({
    where: whereClause,
    ...(transaction && { transaction }),
  });

  let pendingDays = 0;
  for (const req of requests) {
    if (getFiscalYear(req.startDate) === currentYear) {
      pendingDays += parseFloat(req.totalDays || 0);
    }
  }

  return {
    dbRemaining,
    effectiveRemaining: dbRemaining - pendingDays,
    pendingDays,
    balanceRecord: balance
  };
};

/**
 * Helper: ดึง LeaveType จาก code
 */
const getLeaveTypeByCode = async (code) => {
  return await LeaveType.findOne({ where: { code, isActive: true } });
};

/**
 * ตรวจสอบเงื่อนไขการลาคลอดบุตร
 */
const validateMaternityLeave = async (userId, leaveTypeId, totalDays) => {
  if (totalDays > 90) {
    return { valid: false, message: "ลาคลอดบุตรได้ไม่เกิน 90 วัน" };
  }

  return { valid: true };
};

/**
 * ตรวจสอบเงื่อนไขการลาช่วยภรรยาคลอด
 */
const validatePaternityLeave = async (
  userId,
  leaveTypeId,
  startDate,
  childBirthDate,
  workingDays,
  excludeRequestId,
  transaction
) => {
  if (!childBirthDate) {
    return { valid: false, message: "กรุณาระบุวันที่ภรรยาคลอดบุตร" };
  }

  const birthDate = new Date(childBirthDate);
  const leaveStart = new Date(startDate);
  const diffDays = Math.ceil((leaveStart - birthDate) / (1000 * 60 * 60 * 24));

  if (diffDays > 90) {
    return {
      valid: false,
      message: "ต้องลาภายใน 90 วันนับจากวันที่ภรรยาคลอดบุตร",
    };
  }

  const balanceInfo = await getEffectiveRemainingDays(userId, leaveTypeId, startDate, excludeRequestId, transaction);
  if (!balanceInfo) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  if (workingDays > balanceInfo.effectiveRemaining) {
    return {
      valid: false,
      message: `สิทธิ์ลาช่วยภรรยาคลอดคงเหลือ ${balanceInfo.effectiveRemaining} วันทำการ (รออนุมัติ ${balanceInfo.pendingDays} วัน)`,
    };
  }

  return { valid: true };
};

/**
 * ตรวจสอบเงื่อนไขการลากิจเลี้ยงดูบุตร
 */
const validateChildcareLeave = async (userId, leaveTypeId, workingDays, startDate, excludeRequestId, transaction) => {
  const balanceInfo = await getEffectiveRemainingDays(userId, leaveTypeId, startDate, excludeRequestId, transaction);
  if (!balanceInfo) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  if (workingDays > balanceInfo.effectiveRemaining) {
    return {
      valid: false,
      message: `สิทธิ์ลากิจเลี้ยงดูบุตรคงเหลือ ${balanceInfo.effectiveRemaining} วันทำการ (รออนุมัติ ${balanceInfo.pendingDays} วัน)`,
    };
  }

  return { valid: true, isPaidLeave: false };
};

/**
 * ตรวจสอบเงื่อนไขการลาอุปสมบท/ฮัจย์
 */
const validateOrdinationLeave = async (
  userId,
  leaveTypeId,
  startDate,
  ceremonyDate,
  totalDays
) => {
  if (!ceremonyDate) {
    return {
      valid: false,
      message: "กรุณาระบุวันที่อุปสมบท/เดินทางไปประกอบพิธีฮัจย์",
    };
  }

  const ceremony = new Date(ceremonyDate);
  const now = new Date();
  const diffDays = Math.ceil((ceremony - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 60) {
    return {
      valid: false,
      message: "ต้องยื่นคำขอลาล่วงหน้าอย่างน้อย 60 วันก่อนวันอุปสมบท/เดินทาง",
    };
  }

  if (totalDays > 120) {
    return { valid: false, message: "ลาอุปสมบท/ฮัจย์ได้ไม่เกิน 120 วัน" };
  }

  return { valid: true };
};

/**
 * ตรวจสอบเงื่อนไขการลาตรวจเลือก/เตรียมพล
 */
const validateMilitaryLeave = async (userId, leaveTypeId, startDate) => {
  return { valid: true, autoApprove: true };
};

/**
 * ตรวจสอบเงื่อนไขการลากิจส่วนตัว
 */
const validatePersonalLeave = async (userId, leaveTypeId, workingDays, startDate, excludeRequestId, transaction) => {
  const balanceInfo = await getEffectiveRemainingDays(userId, leaveTypeId, startDate, excludeRequestId, transaction);
  if (!balanceInfo) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  if (workingDays > balanceInfo.effectiveRemaining) {
    return {
      valid: false,
      message: `สิทธิ์ลากิจส่วนตัวคงเหลือ ${balanceInfo.effectiveRemaining} วันทำการ (รออนุมัติ ${balanceInfo.pendingDays} วัน)`,
    };
  }

  return { valid: true };
};

/**
 * ตรวจสอบเงื่อนไขการลาป่วย
 */
const validateSickLeave = async (
  userId,
  leaveTypeId,
  totalDays,
  hasMedicalCertificate,
  isLongTermSick,
  startDate,
  excludeRequestId,
  transaction
) => {
  if (totalDays >= 30 && !hasMedicalCertificate) {
    return {
      valid: false,
      message: "ลาป่วยตั้งแต่ 30 วันขึ้นไปต้องมีใบรับรองแพทย์",
    };
  }

  const balanceInfo = await getEffectiveRemainingDays(userId, leaveTypeId, startDate, excludeRequestId, transaction);
  if (!balanceInfo) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  if (totalDays > balanceInfo.effectiveRemaining) {
    return {
      valid: false,
      message: `สิทธิ์ลาป่วยคงเหลือ ${balanceInfo.effectiveRemaining} วัน (รออนุมัติ ${balanceInfo.pendingDays} วัน)`,
    };
  }

  return { valid: true };
};

/**
 * ตรวจสอบเงื่อนไขการลาพักผ่อน
 */
const validateVacationLeave = async (userId, leaveTypeId, workingDays, startDate, excludeRequestId, transaction) => {
  const balanceInfo = await getEffectiveRemainingDays(userId, leaveTypeId, startDate, excludeRequestId, transaction);
  if (!balanceInfo) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  if (workingDays > balanceInfo.effectiveRemaining) {
    return {
      valid: false,
      message: `สิทธิ์ลาพักผ่อนคงเหลือ ${balanceInfo.effectiveRemaining} วันทำการ (รออนุมัติ ${balanceInfo.pendingDays} วัน)`,
    };
  }

  return { valid: true };
};

/**
 * ตรวจสอบเงื่อนไขการลาทั้งหมด
 */
const validateLeaveRequest = async (leaveData, transaction = null) => {
  const {
    userId,
    leaveTypeId,
    startDate,
    endDate,
    childBirthDate,
    ceremonyDate,
    hasMedicalCertificate,
    isLongTermSick,
    timeSlot,
    excludeRequestId,
  } = leaveData;

  const leaveTypeRecord = await LeaveType.findByPk(leaveTypeId, {
    ...(transaction && { transaction }),
  });
  if (!leaveTypeRecord) {
    return { valid: false, message: "ประเภทการลาไม่ถูกต้อง", totalDays: 0, workingDays: 0 };
  }
  const leaveTypeCode = leaveTypeRecord.code;

  let totalDays = calculateTotalDays(startDate, endDate);
  let workingDays = await calculateWorkingDays(startDate, endDate);

  if (timeSlot === "morning" || timeSlot === "afternoon") {
    totalDays = 0.5;
    workingDays = workingDays > 0 ? 0.5 : 0;
  }

  let result = { valid: true };

  switch (leaveTypeCode) {
    case "maternity":
      result = await validateMaternityLeave(userId, leaveTypeId, totalDays);
      break;
    case "paternity":
      result = await validatePaternityLeave(
        userId,
        leaveTypeId,
        startDate,
        childBirthDate,
        workingDays,
        excludeRequestId,
        transaction
      );
      break;
    case "childcare":
      result = await validateChildcareLeave(userId, leaveTypeId, workingDays, startDate, excludeRequestId, transaction);
      break;
    case "ordination":
      result = await validateOrdinationLeave(
        userId,
        leaveTypeId,
        startDate,
        ceremonyDate,
        totalDays
      );
      break;
    case "military":
      result = await validateMilitaryLeave(userId, leaveTypeId, startDate);
      break;
    case "personal":
      result = await validatePersonalLeave(userId, leaveTypeId, workingDays, startDate, excludeRequestId, transaction);
      break;
    case "sick":
      result = await validateSickLeave(
        userId,
        leaveTypeId,
        totalDays,
        hasMedicalCertificate,
        isLongTermSick,
        startDate,
        excludeRequestId,
        transaction
      );
      break;
    case "vacation":
      result = await validateVacationLeave(userId, leaveTypeId, workingDays, startDate, excludeRequestId, transaction);
      break;
    default:
      result = { valid: false, message: "ประเภทการลาไม่ถูกต้อง" };
  }

  return {
    ...result,
    totalDays,
    workingDays,
    countWorkingDaysOnly: WORKING_DAYS_ONLY_LEAVE_TYPES.includes(leaveTypeCode),
  };
};

/**
 * รีเซ็ตวันลาประจำปีงบประมาณใหม่ (1 ต.ค.)
 */
const resetAnnualLeaveBalance = async () => {
  const currentYear = getFiscalYear();
  const newYear = currentYear + 1;
  const leaveTypes = await LeaveType.findAll({ where: { isActive: true } });
  const users = await User.findAll({ where: { isActive: true } });

  let usersUpdated = 0;

  for (const user of users) {
    for (const lt of leaveTypes) {
      const currentBalance = await LeaveBalance.findOne({
        where: { userId: user.id, leaveTypeId: lt.id, year: currentYear },
      });

      let carriedOver = 0;
      if (currentBalance && lt.code === "vacation") {
        const remaining = currentBalance.getRemainingDays();
        let yearsOfService = 0;
        if (user.startDate) {
          const startDate = new Date(user.startDate);
          yearsOfService = Math.floor(
            (new Date() - startDate) / (365.25 * 24 * 60 * 60 * 1000)
          );
        }
        const maxAccrued = yearsOfService >= 10 ? 20 : 10;
        carriedOver = Math.min(remaining, maxAccrued);
      }

      await LeaveBalance.findOrCreate({
        where: { userId: user.id, leaveTypeId: lt.id, year: newYear },
        defaults: {
          totalDays: lt.defaultDays,
          usedDays: 0,
          carriedOverDays: carriedOver,
        },
      });
    }
    usersUpdated++;
  }

  return { success: true, usersUpdated };
};

module.exports = {
  getFiscalYear,
  calculateWorkingDays,
  calculateTotalDays,
  validateLeaveRequest,
  resetAnnualLeaveBalance,
  getUserLeaveBalance,
  getLeaveTypeByCode,
  getEffectiveRemainingDays,
  WORKING_DAYS_ONLY_LEAVE_TYPES,
  INCLUDE_HOLIDAYS_LEAVE_TYPES,
};
