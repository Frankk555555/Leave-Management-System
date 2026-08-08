const cron = require("node-cron");
const { calculateAndCreateFiscalYearBalances } = require("../services/leaveBalanceService");

let scheduledTask = null;

/**
 * ลงทะเบียนและเริ่มต้น Scheduled Job สำหรับคำนวณวันลาปีงบประมาณใหม่
 * ทำงานทุกวันที่ 1 ตุลาคม เวลา 00:01 น. (เวลาประเทศไทย: Asia/Bangkok)
 */
const initFiscalYearCron = () => {
  if (process.env.ENABLE_CRON === "false") {
    console.log("[FiscalYearJob] Scheduled jobs disabled via ENABLE_CRON=false");
    return null;
  }

  // Cron Expression: 1 0 1 10 * (ทุกวันที่ 1 ต.ค. เวลา 00:01 น.)
  const cronSchedule = process.env.FISCAL_YEAR_CRON_SCHEDULE || "1 0 1 10 *";
  const timezone = process.env.CRON_TIMEZONE || "Asia/Bangkok";

  console.log(
    `[FiscalYearJob] Initializing fiscal year cron: schedule='${cronSchedule}', timezone='${timezone}'`
  );

  scheduledTask = cron.schedule(
    cronSchedule,
    async () => {
      console.log(`[FiscalYearJob] Cron triggered at ${new Date().toISOString()}`);
      try {
        const result = await calculateAndCreateFiscalYearBalances({
          triggeredBy: "cron",
        });
        console.log(
          `[FiscalYearJob] Fiscal year balances successfully created:`,
          {
            targetYear: result.targetYear,
            usersProcessed: result.usersProcessed,
            balancesCreated: result.balancesCreated,
            balancesUpdated: result.balancesUpdated,
            executionTimeMs: result.executionTimeMs,
          }
        );
      } catch (error) {
        console.error(`[FiscalYearJob] Error executing fiscal year cron job:`, error);
      }
    },
    {
      scheduled: true,
      timezone: timezone,
    }
  );

  return scheduledTask;
};

module.exports = {
  initFiscalYearCron,
  getScheduledTask: () => scheduledTask,
};
