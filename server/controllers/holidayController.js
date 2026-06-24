const { Holiday } = require("../models");
const { Op } = require("sequelize");

// @desc    Get all holidays
// @route   GET /api/holidays
// @access  Private
const getHolidays = async (req, res) => {
  try {
    const { year } = req.query;
    let where = {};

    if (year) {
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);
      where.date = {
        [Op.between]: [startOfYear, endOfYear],
      };
    }

    const holidays = await Holiday.findAll({
      where,
      order: [["date", "ASC"]],
    });
    res.json(holidays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Create holiday
// @route   POST /api/holidays
// @access  Private/Admin
const createHoliday = async (req, res) => {
  try {
    const { name, date, description, isHalfDay } = req.body;

    const holiday = await Holiday.create({
      name,
      date,
      description,
      isHalfDay: isHalfDay || false,
    });

    res.status(201).json(holiday);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Update holiday
// @route   PUT /api/holidays/:id
// @access  Private/Admin
const updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByPk(req.params.id);

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    const { name, date, description, isHalfDay } = req.body;

    await holiday.update({
      name: name || holiday.name,
      date: date || holiday.date,
      description:
        description !== undefined ? description : holiday.description,
      isHalfDay: isHalfDay !== undefined ? isHalfDay : holiday.isHalfDay,
    });

    res.json(holiday);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Delete holiday
// @route   DELETE /api/holidays/:id
// @access  Private/Admin
const deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByPk(req.params.id);

    if (!holiday) {
      return res.status(404).json({ message: "Holiday not found" });
    }

    await holiday.destroy();
    res.json({ message: "Holiday removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Initialize default holidays for current year
// @route   POST /api/holidays/init
// @access  Private/Admin
const initializeHolidays = async (req, res) => {
  try {
    const year = new Date().getFullYear();
    const defaultHolidays = [
      {
        name: "วันขึ้นปีใหม่",
        date: new Date(year, 0, 1),
        description: "New Year's Day",
      },
      {
        name: "วันมาฆบูชา",
        date: new Date(year, 1, 24),
        description: "Makha Bucha Day",
      },
      {
        name: "วันจักรี",
        date: new Date(year, 3, 6),
        description: "Chakri Memorial Day",
      },
      {
        name: "วันสงกรานต์",
        date: new Date(year, 3, 13),
        description: "Songkran Festival",
      },
      {
        name: "วันสงกรานต์",
        date: new Date(year, 3, 14),
        description: "Songkran Festival",
      },
      {
        name: "วันสงกรานต์",
        date: new Date(year, 3, 15),
        description: "Songkran Festival",
      },
      {
        name: "วันแรงงานแห่งชาติ",
        date: new Date(year, 4, 1),
        description: "National Labour Day",
      },
      {
        name: "วันฉัตรมงคล",
        date: new Date(year, 4, 4),
        description: "Coronation Day",
      },
      {
        name: "วันวิสาขบูชา",
        date: new Date(year, 4, 22),
        description: "Visakha Bucha Day",
      },
      {
        name: "วันเฉลิมพระชนมพรรษา ร.10",
        date: new Date(year, 6, 28),
        description: "H.M. King's Birthday",
      },
      {
        name: "วันเฉลิมพระชนมพรรษา พระราชินี",
        date: new Date(year, 7, 12),
        description: "H.M. Queen's Birthday",
      },
      {
        name: "วันคล้ายวันสวรรคต ร.9",
        date: new Date(year, 9, 13),
        description: "King Bhumibol Memorial Day",
      },
      {
        name: "วันปิยมหาราช",
        date: new Date(year, 9, 23),
        description: "Chulalongkorn Day",
      },
      {
        name: "วันคล้ายวันพระบรมราชสมภพ ร.9",
        date: new Date(year, 11, 5),
        description: "King Bhumibol's Birthday",
      },
      {
        name: "วันรัฐธรรมนูญ",
        date: new Date(year, 11, 10),
        description: "Constitution Day",
      },
      {
        name: "วันสิ้นปี",
        date: new Date(year, 11, 31),
        description: "New Year's Eve",
      },
    ];

    for (const holiday of defaultHolidays) {
      const holidayDate = new Date(holiday.date);
      holidayDate.setHours(0, 0, 0, 0);

      const exists = await Holiday.findOne({
        where: {
          date: holidayDate,
        },
      });

      if (!exists) {
        await Holiday.create({
          ...holiday,
          date: holidayDate,
        });
      }
    }

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);

    const holidays = await Holiday.findAll({
      where: {
        date: {
          [Op.between]: [startOfYear, endOfYear],
        },
      },
      order: [["date", "ASC"]],
    });

    res.json(holidays);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

module.exports = {
  getHolidays,
  createHoliday,
  updateHoliday,
  deleteHoliday,
  initializeHolidays,
};
