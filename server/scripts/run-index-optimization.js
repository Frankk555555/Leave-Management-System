const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { sequelize } = require("../config/database");

const targetIndexes = [
  {
    table: "leave_requests",
    name: "idx_leave_requests_user_status_start_date",
    fields: ["user_id", "status", "start_date"],
  },
  {
    table: "leave_requests",
    name: "idx_leave_requests_status_start_date",
    fields: ["status", "start_date"],
  },
  {
    table: "users",
    name: "idx_users_dept_active",
    fields: ["department_id", "is_active"],
  },
  {
    table: "users",
    name: "idx_users_role_active",
    fields: ["role", "is_active"],
  },
  {
    table: "users",
    name: "idx_users_supervisor",
    fields: ["supervisor_id"],
  },
  {
    table: "leave_history",
    name: "idx_leave_history_request_created",
    fields: ["leave_request_id", "created_at"],
  },
  {
    table: "leave_history",
    name: "idx_leave_history_action_by",
    fields: ["action_by"],
  },
  {
    table: "notifications",
    name: "idx_notifications_user_read_created",
    fields: ["user_id", "is_read", "created_at"],
  },
];

async function runIndexOptimization() {
  try {
    console.log("Connecting to database...");
    await sequelize.authenticate();
    console.log("Database connection established.");

    const queryInterface = sequelize.getQueryInterface();

    for (const item of targetIndexes) {
      try {
        const existingIndexes = await queryInterface.showIndex(item.table);
        const exists = existingIndexes.some((idx) => idx.name === item.name);

        if (exists) {
          console.log(`[OK] Index ${item.name} already exists on ${item.table}`);
        } else {
          console.log(`[+] Creating index ${item.name} on ${item.table} (${item.fields.join(", ")})...`);
          await queryInterface.addIndex(item.table, item.fields, {
            name: item.name,
          });
          console.log(`[SUCCESS] Created index ${item.name} on ${item.table}`);
        }
      } catch (err) {
        console.warn(`[WARN] Could not process index ${item.name} on ${item.table}:`, err.message);
      }
    }

    console.log("\nDatabase Index Optimization completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Index optimization failed:", error);
    process.exit(1);
  }
}

runIndexOptimization();
