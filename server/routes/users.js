const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getSupervisors,
  updateProfile,
  updateProfileImage,
  updateSignatureImage,
  resetUserPassword,
  importUsers,
} = require("../controllers/userController");
const { protect, admin } = require("../middleware/auth");

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

let storage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  // Cloudinary config is already done in upload.js, but we can set it up here or just use the storage
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "leave_management/profiles",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    },
  });
} else {
  const profileDir = "uploads/profiles/";
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, profileDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        `profile-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`
      );
    },
  });
}

const uploadProfile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("รองรับเฉพาะไฟล์รูปภาพ (jpeg, jpg, png, gif, webp)"));
  },
});

// Multer config for import files (CSV/Excel)
const importDir = "uploads/imports/";
if (!fs.existsSync(importDir)) {
  fs.mkdirSync(importDir, { recursive: true });
}

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, importDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `import-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadImport = multer({
  storage: importStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /csv|xlsx|xls/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    if (extname) {
      return cb(null, true);
    }
    cb(new Error("รองรับเฉพาะไฟล์ .csv, .xlsx, .xls"));
  },
});

// Profile routes (for logged-in users to edit their own profile)
router.put("/profile", protect, updateProfile);
router.put(
  "/profile/image",
  protect,
  uploadProfile.single("profileImage"),
  updateProfileImage
);
router.put(
  "/profile/signature",
  protect,
  uploadProfile.single("signatureImage"),
  updateSignatureImage
);

// Import users route (Admin only)
router.post(
  "/import",
  protect,
  admin,
  uploadImport.single("file"),
  importUsers
);

router.get("/supervisors", protect, getSupervisors); // Protected - requires authentication
router
  .route("/")
  .get(protect, admin, getUsers)
  .post(protect, admin, createUser);

router
  .route("/:id")
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser)
  .delete(protect, admin, deleteUser);

// Admin reset password route
router.put("/:id/reset-password", protect, admin, resetUserPassword);

module.exports = router;
