const { validateEnv } = require("../config/validateEnv");

describe("validateEnv", () => {
  const validBaseEnv = {
    NODE_ENV: "development",
    JWT_SECRET: "this_is_a_very_secure_long_jwt_secret_key_123456",
    DB_HOST: "127.0.0.1",
    DB_NAME: "leave_management",
    DB_USER: "root",
    DB_PASSWORD: "",
  };

  it("should pass when all critical variables are present", () => {
    const result = validateEnv(validBaseEnv, { exitOnError: false, silent: true });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should fail when JWT_SECRET is missing or empty", () => {
    const testEnv = { ...validBaseEnv, JWT_SECRET: "" };
    const result = validateEnv(testEnv, { exitOnError: false, silent: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("JWT_SECRET is missing")])
    );
  });

  it("should fail when JWT_SECRET is placeholder value", () => {
    const testEnv = { ...validBaseEnv, JWT_SECRET: "your_jwt_secret_here" };
    const result = validateEnv(testEnv, { exitOnError: false, silent: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("JWT_SECRET is missing or using default placeholder")])
    );
  });

  it("should fail when database connection variables are missing", () => {
    const testEnv = { ...validBaseEnv, DB_HOST: "", DB_NAME: "", DB_USER: "" };
    const result = validateEnv(testEnv, { exitOnError: false, silent: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("DB_HOST is required"),
        expect.stringContaining("DB_NAME is required"),
        expect.stringContaining("DB_USER is required"),
      ])
    );
  });

  it("should require DB_PASSWORD when in production", () => {
    const testEnv = {
      ...validBaseEnv,
      NODE_ENV: "production",
      DB_PASSWORD: "",
    };
    const result = validateEnv(testEnv, { exitOnError: false, silent: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("DB_PASSWORD cannot be empty in production")])
    );
  });

  it("should fail when partial Cloudinary credentials are provided", () => {
    const testEnv = {
      ...validBaseEnv,
      CLOUDINARY_CLOUD_NAME: "my_cloud",
      CLOUDINARY_API_KEY: "123456",
      CLOUDINARY_API_SECRET: "", // Missing secret!
    };
    const result = validateEnv(testEnv, { exitOnError: false, silent: true });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("Partial Cloudinary configuration detected")])
    );
  });

  it("should pass when all 3 Cloudinary credentials are provided", () => {
    const testEnv = {
      ...validBaseEnv,
      CLOUDINARY_CLOUD_NAME: "my_cloud",
      CLOUDINARY_API_KEY: "123456",
      CLOUDINARY_API_SECRET: "secret123",
    };
    const result = validateEnv(testEnv, { exitOnError: false, silent: true });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should produce warnings for missing email config", () => {
    const result = validateEnv(validBaseEnv, { exitOnError: false, silent: true });
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("No valid Email API Key")])
    );
  });
});
