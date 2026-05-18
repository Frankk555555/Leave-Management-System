const { Sequelize } = require("sequelize");

// Determine if SSL is required (cloud databases like Aiven require SSL)
const dbHost = process.env.DB_HOST || "localhost";
const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(dbHost);

// Build dialect options with SSL for cloud connections
const dialectOptions = isLocalhost
  ? {}
  : {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Aiven uses self-signed certificates
      },
    };

// Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || "leave_management",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: dbHost,
    port: process.env.DB_PORT || 3307,
    dialect: "mysql",
    logging: false,
    dialectOptions,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    define: {
      timestamps: true,
      underscored: true, // Use snake_case for column names
      freezeTableName: true, // Don't pluralize table names
    },
  }
);

// Test connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL connection successfully");
  } catch (error) {
    console.error("❌ Unable to connect to MySQL database:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };
