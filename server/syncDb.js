const { sequelize } = require("./config/database");

const syncDb = async () => {
  try {
    await sequelize.query("ALTER TABLE holidays ADD COLUMN is_half_day TINYINT(1) DEFAULT 0 COMMENT 'เป็นวันหยุดครึ่งวันหรือไม่';");
    console.log("Added is_half_day column successfully");
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error(error);
    }
  }
  process.exit(0);
};

syncDb();
