const express = require("express");
const router = express.Router();
const {
  getLeaveStatistics,
  exportToExcel,
  exportToPDF,
  resetYearlyLeaveBalance,
  getAllRequests,
  getPersonnelLeaveSummary,
  exportPersonnelSummaryPDF,
} = require("../controllers/reportController");
const { protect, admin } = require("../middleware/auth");

router.get("/statistics", protect, admin, getLeaveStatistics);
router.get("/export/excel", protect, admin, exportToExcel);
router.get("/export/pdf", protect, admin, exportToPDF);
router.get("/personnel-summary", protect, admin, getPersonnelLeaveSummary);
router.get(
  "/export/personnel-summary-pdf",
  protect,
  admin,
  exportPersonnelSummaryPDF
);
router.post("/reset-yearly", protect, admin, resetYearlyLeaveBalance);
router.get("/all-requests", protect, admin, getAllRequests);

module.exports = router;
