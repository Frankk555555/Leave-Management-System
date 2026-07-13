const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/leaveRequestController");
const { protect, admin, supervisor } = require("../middleware/auth");
const upload = require("../middleware/upload");

router
  .route("/")
  .post(protect, upload.array("attachments", 5), upload.validateAttachments, createLeaveRequest)
  .get(protect, getMyLeaveRequests);

router.get("/all", protect, admin, getAllLeaveRequests);
router.get("/team", protect, getTeamLeaveRequests);
router.get("/pending", protect, supervisor, getPendingLeaveRequests);

router.get("/:id", protect, getLeaveRequestById);
router.put("/:id", protect, updateLeaveRequest);
router.put("/:id/cancel", protect, cancelLeaveRequest);
router.put("/:id/confirm", protect, admin, confirmLeaveRequest);
router.put("/:id/approve", protect, supervisor, approveLeaveRequest);
router.put("/:id/reject", protect, supervisor, rejectLeaveRequest);

module.exports = router;
