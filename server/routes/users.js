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
  previewDbSync,
  executeDbSync,
  previewApiSync,
  executeApiSync,
  getMockUniversityApi,
  setupMockDb,
  downloadImportTemplate,
} = require("../controllers/userController");
const { protect, admin } = require("../middleware/auth");
const validateFileSignature = require("../middleware/validateFileSignature");

const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

let storage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
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

let signatureStorage;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  signatureStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "leave_management/signatures",
      allowed_formats: ["jpg", "jpeg", "png"],
    },
  });
} else {
  const profileDir = "uploads/profiles/";
  signatureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, profileDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        `sig-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`
      );
    },
  });
}

const uploadSignature = multer({
  storage: signatureStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error("รองรับเฉพาะไฟล์รูปภาพ (jpeg, jpg, png)"));
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
  validateFileSignature("image"),
  updateProfileImage
);
router.put(
  "/profile/signature",
  protect,
  uploadSignature.single("signatureImage"),
  validateFileSignature("signature"),
  updateSignatureImage
);

// Import users route (Admin only)
router.post(
  "/import",
  protect,
  admin,
  uploadImport.single("file"),
  validateFileSignature("import"),
  importUsers
);
router.get("/import-template", protect, admin, downloadImportTemplate);

// Database/API import and sync routes (Admin only)
router.post("/import-db-preview", protect, admin, previewDbSync);
router.post("/import-db-sync", protect, admin, executeDbSync);
router.post("/import-api-preview", protect, admin, previewApiSync);
router.post("/import-api-sync", protect, admin, executeApiSync);
router.post("/setup-mock-db", protect, admin, setupMockDb);
router.get("/mock-university-api", protect, admin, getMockUniversityApi);

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
