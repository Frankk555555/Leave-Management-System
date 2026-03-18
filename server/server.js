const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { sequelize, testConnection } = require("./config/database");

// Connect to MySQL database
testConnection();

const app = express();

// Security Middleware - Helmet for security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow uploads to be accessed
  })
);

// Rate Limiting - General API limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP per 15 minutes (dev mode — reduce in production)
  message: { message: "คำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for auth endpoints
// NOTE: In production, reduce 'max' to 10-20 to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 attempts per IP per 15 minutes (dev mode — reduce to 10-20 in production)
  message: { message: "พยายามเข้าสู่ระบบมากเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limit to all requests
app.use(generalLimiter);

// CORS Configuration - Strict origin control
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static folder for uploads with download headers
app.use(
  "/uploads",
  (req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.set("Access-Control-Allow-Origin", origin);
    }
    res.set("Access-Control-Expose-Headers", "Content-Disposition");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

// Routes - Apply stricter rate limit to auth endpoints
app.use("/api/auth", authLimiter, require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/leave-requests", require("./routes/leaveRequests"));
app.use("/api/leave-types", require("./routes/leaveTypes"));
app.use("/api/holidays", require("./routes/holidays"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/webhooks", require("./routes/webhooks"));
app.use("/api/departments", require("./routes/departments"));
app.use("/api/faculties", require("./routes/faculties"));
app.use("/api/forms", require("./routes/forms"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "University Leave Management API is running",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Hide error details in production
  if (process.env.NODE_ENV === "production") {
    res.status(500).json({ message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
  } else {
    res
      .status(500)
      .json({ message: "Something went wrong!", error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
