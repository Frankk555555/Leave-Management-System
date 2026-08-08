/**
 * Environment Variables Startup Validator
 * Validates critical environment variables before application bootstrap.
 */

const validateEnv = (env = process.env, options = { exitOnError: true, silent: false }) => {
  const errors = [];
  const warnings = [];
  const isProduction = env.NODE_ENV === "production";

  // 1. Critical Core Variables
  if (!env.JWT_SECRET || env.JWT_SECRET.trim() === "" || env.JWT_SECRET === "your_jwt_secret_here") {
    errors.push("JWT_SECRET is missing or using default placeholder value.");
  } else if (env.JWT_SECRET.length < 32 && isProduction) {
    warnings.push("JWT_SECRET is shorter than 32 characters. Consider using a stronger secret in production.");
  }

  // 2. Database Configuration
  if (!env.DB_HOST || env.DB_HOST.trim() === "") {
    errors.push("DB_HOST is required (e.g. 127.0.0.1 or MySQL host).");
  }

  if (!env.DB_NAME || env.DB_NAME.trim() === "") {
    errors.push("DB_NAME is required (database name).");
  }

  if (!env.DB_USER || env.DB_USER.trim() === "") {
    errors.push("DB_USER is required (database username).");
  }

  if (isProduction && (!env.DB_PASSWORD || env.DB_PASSWORD.trim() === "")) {
    errors.push("DB_PASSWORD cannot be empty in production environment.");
  }

  // 3. Cloudinary Configuration (All-or-Nothing check)
  const cloudinaryFields = [
    { key: "CLOUDINARY_CLOUD_NAME", value: env.CLOUDINARY_CLOUD_NAME },
    { key: "CLOUDINARY_API_KEY", value: env.CLOUDINARY_API_KEY },
    { key: "CLOUDINARY_API_SECRET", value: env.CLOUDINARY_API_SECRET },
  ];

  const providedCloudinary = cloudinaryFields.filter(
    (f) => f.value && f.value.trim() !== "" && !f.value.startsWith("your_cloudinary")
  );

  if (providedCloudinary.length > 0 && providedCloudinary.length < 3) {
    const missing = cloudinaryFields
      .filter((f) => !f.value || f.value.trim() === "" || f.value.startsWith("your_cloudinary"))
      .map((f) => f.key);
    errors.push(
      `Partial Cloudinary configuration detected. Missing: ${missing.join(", ")}. Provide all 3 keys or leave all blank for local storage.`
    );
  }

  // 4. Optional Service Warnings
  const hasEmailConfig =
    (env.BREVO_API_KEY && !env.BREVO_API_KEY.includes("your_brevo")) ||
    (env.RESEND_API_KEY && !env.RESEND_API_KEY.includes("your_resend"));

  if (!hasEmailConfig) {
    warnings.push("No valid Email API Key (BREVO_API_KEY or RESEND_API_KEY) found. Email notifications will be skipped.");
  }

  if (isProduction && !env.FRONTEND_URL && !env.CLIENT_URL) {
    warnings.push("FRONTEND_URL/CLIENT_URL is not defined in production. CORS might reject client requests.");
  }

  const isValid = errors.length === 0;

  // Print results
  if (!options.silent) {
    if (!isValid) {
      console.error("\n==================================================");
      console.error("❌ CRITICAL ENVIRONMENT CONFIGURATION ERROR(S):");
      console.error("==================================================");
      errors.forEach((err, idx) => console.error(`  ${idx + 1}. ${err}`));
      console.error("--------------------------------------------------");
      console.error("💡 Please check your .env file or deployment config.");
      console.error("==================================================\n");

      if (options.exitOnError !== false) {
        process.exit(1);
      }
    } else {
      console.log("✅ Environment variables validated successfully.");
      if (warnings.length > 0) {
        console.warn("⚠️  Environment Warnings:");
        warnings.forEach((warn, idx) => console.warn(`  - ${warn}`));
      }
    }
  }

  return {
    valid: isValid,
    errors,
    warnings,
  };
};

module.exports = { validateEnv };
