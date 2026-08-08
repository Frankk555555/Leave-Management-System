const { Op } = require("sequelize");
const { User, LeaveType, LeaveBalance, Notification } = require("../models");
const { getFiscalYear } = require("./leaveValidationService");

/**
 * คำนวณอายุงาน (ปี) ณ วันที่กำหนด
 * @param {Date|string} startDate วันที่เริ่มงาน
 * @param {Date|string} asOfDate วันที่ใช้เทียบ (ค่าเริ่มต้น: วันที่ปัจจุบัน)
 * @returns {number}
 */
const calculateYearsOfService = (startDate, asOfDate = new Date()) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const target = new Date(asOfDate);
  if (isNaN(start.getTime()) || isNaN(target.getTime())) return 0;

  let years = target.getFullYear() - start.getFullYear();
  const monthDiff = target.getMonth() - start.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && target.getDate() < start.getDate())) {
    years--;
  }
  return Math.max(0, years);
};

/**
 * คำนวณและสร้าง/อัปเดต LeaveBalance สำหรับปีงบประมาณใหม่
 * @param {Object} options
 * @param {number} [options.targetYear] ปีงบประมาณเป้าหมาย (หากไม่ระบุจะคำนวณจากวันที่ปัจจุบัน)
 * @param {string} [options.triggeredBy="cron"] ผู้เรียกใช้งาน ("cron" หรือ "manual")
 * @returns {Promise<Object>} สรุปผลการประมวลผล
 */
const calculateAndCreateFiscalYearBalances = async (options = {}) => {
  const startTime = Date.now();
  const triggeredBy = options.triggeredBy || "cron";
  
  // กำหนดปีงบประมาณเป้าหมาย และปีก่อนหน้า
  const currentFiscalYear = getFiscalYear();
  const targetYear = options.targetYear ? parseInt(options.targetYear, 10) : currentFiscalYear;
  const previousYear = targetYear - 1;

  console.log(`[LeaveBalanceService] Starting fiscal year balance calculation: Target FY=${targetYear}, Previous FY=${previousYear}, TriggeredBy=${triggeredBy}`);

  // 1. ดึงข้อมูลผู้ใช้งานที่ยัง Active และประเภทการลาทั้งหมดที่ Active
  const users = await User.findAll({ where: { isActive: true } });
  const leaveTypes = await LeaveType.findAll({ where: { isActive: true } });

  if (users.length === 0 || leaveTypes.length === 0) {
    return {
      success: true,
      targetYear,
      previousYear,
      usersProcessed: 0,
      balancesCreated: 0,
      balancesUpdated: 0,
      balancesSkipped: 0,
      executionTimeMs: Date.now() - startTime,
      results: [],
    };
  }

  const userIds = users.map((u) => u.id);

  // 2. ดึงยอด LeaveBalance ของปีก่อนหน้า และปีเป้าหมาย (ถ้ามี) แบบ Bulk
  const [previousBalances, targetBalances] = await Promise.all([
    LeaveBalance.findAll({
      where: {
        userId: { [Op.in]: userIds },
        year: previousYear,
      },
    }),
    LeaveBalance.findAll({
      where: {
        userId: { [Op.in]: userIds },
        year: targetYear,
      },
    }),
  ]);

  // สร้าง Map สำหรับค้นหาอย่างรวดเร็ว (O(1))
  const previousBalanceMap = new Map();
  for (const pb of previousBalances) {
    previousBalanceMap.set(`${pb.userId}_${pb.leaveTypeId}`, pb);
  }

  const targetBalanceMap = new Map();
  for (const tb of targetBalances) {
    targetBalanceMap.set(`${tb.userId}_${tb.leaveTypeId}`, tb);
  }

  const balancesToCreate = [];
  const balancesToUpdate = [];
  let balancesSkipped = 0;
  const userSummaryList = [];

  // 3. วนลูปคำนวณรายบุคคลและประเภทการลา
  for (const user of users) {
    const yearsOfService = calculateYearsOfService(user.startDate);
    // กฎหมาย/ระเบียบ: อายุงาน >= 10 ปี สะสมวันลาพักผ่อนได้สูงสุด 20 วัน, น้อยกว่า 10 ปีได้ 10 วัน
    const maxAccrued = yearsOfService >= 10 ? 20 : 10;
    
    let userCarriedOverVacation = 0;
    let userTotalVacation = 0;

    for (const lt of leaveTypes) {
      const key = `${user.id}_${lt.id}`;
      const prevBal = previousBalanceMap.get(key);
      const targetBal = targetBalanceMap.get(key);

      let carriedOver = 0;
      // เฉพาะประเภทลาพักผ่อน (vacation) ที่สามารถสะสมวันลาคงเหลือจากปีก่อนได้
      if (lt.code === "vacation" && prevBal) {
        const remaining = prevBal.getRemainingDays ? prevBal.getRemainingDays() : (
          parseFloat(prevBal.totalDays || 0) + parseFloat(prevBal.carriedOverDays || 0) - parseFloat(prevBal.usedDays || 0)
        );
        carriedOver = Math.max(0, Math.min(remaining, maxAccrued));
        userCarriedOverVacation = carriedOver;
        userTotalVacation = carriedOver + parseFloat(lt.defaultDays || 0);
      }

      if (!targetBal) {
        // ยังไม่มี Balance ในปีเป้าหมาย -> เตรียมสร้างใหม่
        balancesToCreate.push({
          userId: user.id,
          leaveTypeId: lt.id,
          year: targetYear,
          totalDays: lt.defaultDays || 0,
          usedDays: 0,
          carriedOverDays: carriedOver,
        });
      } else {
        // มี Balance อยู่แล้ว
        // หากยังไม่ได้ใช้วันลา (usedDays == 0) ให้อัปเดตยอดสะสมและโควตาให้ถูกต้อง
        if (parseFloat(targetBal.usedDays || 0) === 0) {
          balancesToUpdate.push({
            id: targetBal.id,
            totalDays: lt.defaultDays || 0,
            carriedOverDays: carriedOver,
          });
        } else {
          // หากเริ่มใช้วันลาแล้ว ให้ข้ามเพื่อไม่กระทบประวัติ
          balancesSkipped++;
        }
      }
    }

    userSummaryList.push({
      userId: user.id,
      employeeId: user.employeeId,
      name: `${user.firstName} ${user.lastName}`,
      yearsOfService,
      carriedOverVacation: userCarriedOverVacation,
      totalVacation: userTotalVacation,
    });
  }

  // 4. บันทึกข้อมูลลงฐานข้อมูล
  if (balancesToCreate.length > 0) {
    await LeaveBalance.bulkCreate(balancesToCreate);
  }

  if (balancesToUpdate.length > 0) {
    await Promise.all(
      balancesToUpdate.map((item) =>
        LeaveBalance.update(
          {
            totalDays: item.totalDays,
            carriedOverDays: item.carriedOverDays,
          },
          { where: { id: item.id } }
        )
      )
    );
  }

  const executionTimeMs = Date.now() - startTime;
  console.log(
    `[LeaveBalanceService] Completed FY=${targetYear}: ${balancesToCreate.length} created, ${balancesToUpdate.length} updated, ${balancesSkipped} skipped in ${executionTimeMs}ms`
  );

  // 5. แจ้งเตือน Notification ไปยัง Admin และ HR
  try {
    const adminAndHrUsers = await User.findAll({
      where: {
        role: { [Op.in]: ["admin", "hr"] },
        isActive: true,
      },
      attributes: ["id"],
    });

    if (adminAndHrUsers.length > 0) {
      const sourceLabel = triggeredBy === "cron" ? "ระบบอัตโนมัติ (Scheduled Job)" : "ผู้ดูแลระบบ (Manual Trigger)";
      const notifMessage = `ระบบได้ประมวลผลสิทธิ์วันลาประจำปีงบประมาณ ${targetYear} เรียบร้อยแล้ว (${sourceLabel}) บุคลากร ${users.length} คน, สร้างใหม่ ${balancesToCreate.length} รายการ, อัปเดต ${balancesToUpdate.length} รายการ`;

      await Notification.bulkCreate(
        adminAndHrUsers.map((admin) => ({
          userId: admin.id,
          type: "reminder",
          title: `สรุปการปรับปรุงวันลาปีงบประมาณ ${targetYear}`,
          message: notifMessage,
          isRead: false,
        }))
      );
    }
  } catch (notifErr) {
    console.error("[LeaveBalanceService] Error creating admin notifications:", notifErr);
  }

  return {
    success: true,
    targetYear,
    previousYear,
    triggeredBy,
    usersProcessed: users.length,
    balancesCreated: balancesToCreate.length,
    balancesUpdated: balancesToUpdate.length,
    balancesSkipped,
    executionTimeMs,
    results: userSummaryList,
  };
};

module.exports = {
  calculateYearsOfService,
  calculateAndCreateFiscalYearBalances,
};
