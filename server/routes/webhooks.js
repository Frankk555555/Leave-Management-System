const express = require("express");
const router = express.Router();
const {
  getWeeklyReport,
  n8nCallback,
  seedWeeklyReportData,
  syncBalancesHandler,
} = require("../controllers/webhookController");

// Weekly report for n8n
router.get("/weekly-report", getWeeklyReport);

// Seed weekly mock data for n8n demo
router.get("/seed-weekly-data", seedWeeklyReportData);
router.post("/seed-weekly-data", seedWeeklyReportData);

// Synchronize leave balances
router.get("/sync-balances", syncBalancesHandler);
router.post("/sync-balances", syncBalancesHandler);

// Callback from n8n
router.post("/n8n-callback", n8nCallback);

module.exports = router;
