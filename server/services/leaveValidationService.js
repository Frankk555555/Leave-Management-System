const {
  Holiday,
  LeaveRequest,
  User,
  LeaveBalance,
  LeaveType,
} = require("../models");
const { Op } = require("sequelize");

// รายชื่อประเภทการลาที่นับเฉพาะวันทำการ (ไม่รวมวันหยุด)
const WORKING_DAYS_ONLY_LEAVE_TYPES = [
  "sick",
  "personal",
  "vacation",
  "paternity",
  "maternity",
  "childcare",
  "ordination",
];

// รายชื่อประเภทการลาที่นับรวมวันหยุด
const INCLUDE_HOLIDAYS_LEAVE_TYPES = ["military"];

/**
 * คำนวณปีงบประมาณจากวันที่ (1 ต.ค. - 30 ก.ย.)
 */
const getFiscalYear = (date = new Date()) => {
  const d = new Date(date);
  const month = d.getMonth(); // 0-11
  const year = d.getFullYear();
  // ถ้าเป็นเดือน ต.ค. - ธ.ค. (9-11) ปีงบประมาณคือปีถัดไป
  return month >= 9 ? year + 1 : year;
};

/**
 * คำนวณวันทำการ (หักวันเสาร์-อาทิตย์ และวันหยุดราชการ)
 */
const calculateWorkingDays = async (startDate, endDate) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  // ดึงวันหยุดราชการในช่วงวันที่
  const holidays = await Holiday.findAll({
    where: {
      date: {
        [Op.between]: [start, end],
      },
    },
  });
  const holidayMap = {};
  holidays.forEach((h) => {
    holidayMap[new Date(h.date).toDateString()] = h.isHalfDay ? 0.5 : 1;
  });

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateString = current.toDateString();

    // ไม่ใช่เสาร์ (6) หรืออาทิตย์ (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      if (holidayMap[dateString]) {
        if (holidayMap[dateString] === 0.5) {
          workingDays += 0.5; // วันหยุดครึ่งวัน ถือเป็นวันทำการ 0.5 วัน
        }
        // ถ้าเป็น 1 (หยุดเต็มวัน) ไม่เพิ่ม workingDays
      } else {
        workingDays++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
};

/**
 * คำนวณจำนวนวันลาทั้งหมด (รวมวันหยุด)
 */
const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = Math.abs(end - start);
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Helper: ดึง LeaveBalance ของ user สำหรับ leaveTypeId + ปีปัจจุบัน
 */
const getUserLeaveBalance = async (userId, leaveTypeId) => {
  const currentYear = getFiscalYear();
  const balance = await LeaveBalance.findOne({
    where: {
      userId,
      leaveTypeId,
      year: currentYear,
    },
  });
  return balance;
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
  workingDays
) => {
  if (!childBirthDate) {
    return { valid: false, message: "กรุณาระบุวันที่ภรรยาคลอดบุตร" };
  }

  const birthDate = new Date(childBirthDate);
  const leaveStart = new Date(startDate);
  const diffDays = Math.ceil((leaveStart - birthDate) / (1000 * 60 * 60 * 24));

  // ต้องลาภายใน 90 วันนับจากวันที่ภรรยาคลอด
  if (diffDays > 90) {
    return {
      valid: false,
      message: "ต้องลาภายใน 90 วันนับจากวันที่ภรรยาคลอดบุตร",
    };
  }

  // ลาได้ไม่เกิน 15 วันทำการ
  const balance = await getUserLeaveBalance(userId, leaveTypeId);
  if (!balance) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  const remaining = balance.getRemainingDays();
  if (workingDays > remaining) {
    return {
      valid: false,
      message: `สิทธิ์ลาช่วยภรรยาคลอดคงเหลือ ${remaining} วันทำการ`,
    };
  }

  return { valid: true };
};

/**
 * ตรวจสอบเงื่อนไขการลากิจเลี้ยงดูบุตร
 */
const validateChildcareLeave = async (userId, leaveTypeId, workingDays) => {
  const balance = await getUserLeaveBalance(userId, leaveTypeId);
  if (!balance) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  const remaining = balance.getRemainingDays();
  if (workingDays > remaining) {
    return {
      valid: false,
      message: `สิทธิ์ลากิจเลี้ยงดูบุตรคงเหลือ ${remaining} วันทำการ`,
    };
  }

  return { valid: true, isPaidLeave: false }; // ไม่ได้รับเงินเดือน
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

  // ต้องยื่นล่วงหน้าอย่างน้อย 60 วัน
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
  // ต้องรายงานภายใน 48 ชั่วโมง แต่ไม่ต้องรออนุมัติ
  // Auto-approve ทันที
  return { valid: true, autoApprove: true };
};

/**
 * ตรวจสอบเงื่อนไขการลากิจส่วนตัว
 */
const validatePersonalLeave = async (userId, leaveTypeId, workingDays) => {
  const balance = await getUserLeaveBalance(userId, leaveTypeId);
  if (!balance) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  const remaining = balance.getRemainingDays();
  if (workingDays > remaining) {
    return {
      valid: false,
      message: `สิทธิ์ลากิจส่วนตัวคงเหลือ ${remaining} วันทำการ`,
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
  isLongTermSick
) => {
  // ถ้าลา 30 วันขึ้นไปต้องมีใบรับรองแพทย์
  if (totalDays >= 30 && !hasMedicalCertificate) {
    return {
      valid: false,
      message: "ลาป่วยตั้งแต่ 30 วันขึ้นไปต้องมีใบรับรองแพทย์",
    };
  }

  const balance = await getUserLeaveBalance(userId, leaveTypeId);
  if (!balance) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  const remaining = balance.getRemainingDays();
  if (totalDays > remaining) {
    return {
      valid: false,
      message: `สิทธิ์ลาป่วยคงเหลือ ${remaining} วัน`,
    };
  }

  return { valid: true };
};

/**
 * ตรวจสอบเงื่อนไขการลาพักผ่อน
 */
const validateVacationLeave = async (userId, leaveTypeId, workingDays) => {
  const balance = await getUserLeaveBalance(userId, leaveTypeId);
  if (!balance) {
    return { valid: false, message: "ไม่พบข้อมูลวันลา" };
  }

  const remaining = balance.getRemainingDays();
  if (workingDays > remaining) {
    return {
      valid: false,
      message: `สิทธิ์ลาพักผ่อนคงเหลือ ${remaining} วันทำการ`,
    };
  }

  return { valid: true };
};



/**
 * ตรวจสอบเงื่อนไขการลาทั้งหมด
 * รับ leaveTypeId (INT FK) แทน leaveType (string)
 */
const validateLeaveRequest = async (leaveData) => {
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
  } = leaveData;

  // Lookup leave type by ID to get the code for business logic
  const leaveTypeRecord = await LeaveType.findByPk(leaveTypeId);
  if (!leaveTypeRecord) {
    return { valid: false, message: "ประเภทการลาไม่ถูกต้อง", totalDays: 0, workingDays: 0 };
  }
  const leaveTypeCode = leaveTypeRecord.code;

  let totalDays = calculateTotalDays(startDate, endDate);
  let workingDays = await calculateWorkingDays(startDate, endDate);

  // Handle Half-Day logic
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
        workingDays
      );
      break;
    case "childcare":
      result = await validateChildcareLeave(userId, leaveTypeId, workingDays);
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
      result = await validatePersonalLeave(userId, leaveTypeId, workingDays);
      break;
    case "sick":
      result = await validateSickLeave(
        userId,
        leaveTypeId,
        totalDays,
        hasMedicalCertificate,
        isLongTermSick
      );
      break;
    case "vacation":
      result = await validateVacationLeave(userId, leaveTypeId, workingDays);
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
 * V2: สร้าง balance ใหม่สำหรับปีใหม่ พร้อม carry over
 */
const resetAnnualLeaveBalance = async () => {
  const currentYear = getFiscalYear();
  const newYear = currentYear + 1;
  const leaveTypes = await LeaveType.findAll({ where: { isActive: true } });
  const users = await User.findAll({ where: { isActive: true } });

  let usersUpdated = 0;

  for (const user of users) {
    for (const lt of leaveTypes) {
      // ดึง balance ปีปัจจุบัน
      const currentBalance = await LeaveBalance.findOne({
        where: { userId: user.id, leaveTypeId: lt.id, year: currentYear },
      });

      let carriedOver = 0;
      if (currentBalance && lt.code === "vacation") {
        // คำนวณวันลาพักผ่อนสะสม
        const remaining = currentBalance.getRemainingDays();
        // คำนวณอายุราชการ
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

      // สร้าง balance สำหรับปีใหม่
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
  WORKING_DAYS_ONLY_LEAVE_TYPES,
  INCLUDE_HOLIDAYS_LEAVE_TYPES,
};
