const FileType = require("file-type");
const fs = require("fs");
const path = require("path");

// Map of allowed MIME types per upload context
const ALLOWED_SIGNATURES = {
  // Profile images (broad image support)
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],

  // Leave attachments (images + documents)
  attachment: [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/x-cfb", // .doc (OLE2 Compound Binary)
    "application/zip", // .docx (OOXML is a zip archive)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],

  // Signature images (strict — only jpeg/png)
  signature: ["image/jpeg", "image/png"],

  // Import files (CSV/Excel)
  import: [
    "application/zip", // .xlsx (OOXML)
    "application/x-cfb", // .xls (OLE2)
    // CSV is plain text — file-type returns undefined for text files
    // Handled as a special case below
  ],
};

/**
 * Middleware factory: validates the actual binary signature (magic bytes)
 * of uploaded files AFTER multer has written them to disk.
 *
 * This catches spoofed files where the extension and Content-Type header
 * have been forged but the actual file content is something else entirely
 * (e.g., an executable renamed to .jpg).
 *
 * @param {"image"|"attachment"|"signature"|"import"} context - The upload context
 * @returns {Function} Express middleware
 */
function validateFileSignature(context) {
  const allowed = ALLOWED_SIGNATURES[context];
  if (!allowed) {
    throw new Error(`Unknown upload context: "${context}"`);
  }

  return async (req, res, next) => {
    // Support both single file (req.file) and multiple files (req.files)
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) return next();

    for (const file of files) {
      // Skip Cloudinary uploads — file is already on cloud, no local path
      // Cloudinary has its own built-in validation
      if (file.path && file.path.startsWith("http")) continue;

      const filePath = file.path;
      if (!filePath) continue;

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const typeResult = await FileType.fromBuffer(fileBuffer);

        if (!typeResult) {
          // file-type returns undefined for text-based files (CSV, plain text, etc.)
          // Allow CSV only in the 'import' context
          const ext = path.extname(file.originalname).toLowerCase();
          if (context === "import" && ext === ".csv") {
            continue; // CSV is text — no magic bytes to validate
          }

          // Unknown binary format — reject and clean up
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: `ไฟล์ "${file.originalname}" มีรูปแบบที่ไม่รองรับหรืออาจเป็นไฟล์อันตราย`,
          });
        }

        if (!allowed.includes(typeResult.mime)) {
          // Detected MIME doesn't match the allowed list — reject and clean up
          fs.unlinkSync(filePath);
          return res.status(400).json({
            message: `ไฟล์ "${file.originalname}" มี file signature ที่ไม่ตรงกับประเภทที่อนุญาต (ตรวจพบ: ${typeResult.mime})`,
          });
        }
      } catch (err) {
        // If we can't read/validate the file, reject it and clean up
        try {
          fs.unlinkSync(filePath);
        } catch {
          // Ignore cleanup errors
        }
        return res.status(400).json({
          message: `เกิดข้อผิดพลาดในการตรวจสอบไฟล์ "${file.originalname}"`,
        });
      }
    }

    next();
  };
}

module.exports = validateFileSignature;
