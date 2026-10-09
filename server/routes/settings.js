const express = require("express");
const router = express.Router();
const { getEmailSettings, updateEmailSettings } = require("../controllers/settingController");
const { protect, admin } = require("../middleware/auth");

router.route("/email").get(protect, admin, getEmailSettings).put(protect, admin, updateEmailSettings);

module.exports = router;
