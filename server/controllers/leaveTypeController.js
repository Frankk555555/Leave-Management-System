const { LeaveType } = require("../models");

// @desc    Get all leave types
// @route   GET /api/leave-types
// @access  Private
const getLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await LeaveType.findAll();
    res.json(leaveTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Create leave type
// @route   POST /api/leave-types
// @access  Private/Admin
const createLeaveType = async (req, res) => {
  try {
    const { name, code, description, defaultDays, requiresMedicalCert } =
      req.body;

    const exists = await LeaveType.findOne({ where: { code } });
    if (exists) {
      return res.status(400).json({ message: "Leave type already exists" });
    }

    const leaveType = await LeaveType.create({
      name,
      code,
      description,
      defaultDays,
      requiresMedicalCert: requiresMedicalCert || false,
    });

    res.status(201).json(leaveType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Update leave type
// @route   PUT /api/leave-types/:id
// @access  Private/Admin
const updateLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.findByPk(req.params.id);

    if (!leaveType) {
      return res.status(404).json({ message: "Leave type not found" });
    }

    const { name, description, defaultDays, requiresMedicalCert } = req.body;

    await leaveType.update({
      name: name || leaveType.name,
      description:
        description !== undefined ? description : leaveType.description,
      defaultDays: defaultDays || leaveType.defaultDays,
      requiresMedicalCert:
        requiresMedicalCert !== undefined
          ? requiresMedicalCert
          : leaveType.requiresMedicalCert,
    });

    res.json(leaveType);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Delete leave type
// @route   DELETE /api/leave-types/:id
// @access  Private/Admin
const deleteLeaveType = async (req, res) => {
  try {
    const leaveType = await LeaveType.findByPk(req.params.id);

    if (!leaveType) {
      return res.status(404).json({ message: "Leave type not found" });
    }

    await leaveType.destroy();
    res.json({ message: "Leave type removed" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

// @desc    Initialize default leave types
// @route   POST /api/leave-types/init
// @access  Private/Admin
const initializeLeaveTypes = async (req, res) => {
  try {
    const defaultTypes = [
      {
        name: "ลาป่วย",
        code: "sick",
        description: "การลาเนื่องจากเจ็บป่วย",
        defaultDays: 60,
        requiresMedicalCert: true,
      },
      {
        name: "ลากิจส่วนตัว",
        code: "personal",
        description: "การลาเพื่อทำกิจธุระส่วนตัว",
        defaultDays: 45,
        requiresMedicalCert: false,
      },
      {
        name: "ลาพักผ่อน",
        code: "vacation",
        description: "การลาพักผ่อนประจำปี",
        defaultDays: 10,
        requiresMedicalCert: false,
      },
      {
        name: "ลาคลอดบุตร",
        code: "maternity",
        description: "การลาเพื่อคลอดบุตร",
        defaultDays: 90,
        requiresMedicalCert: false,
      },
      {
        name: "ลาช่วยเหลือภรรยาที่คลอดบุตร",
        code: "paternity",
        description: "การลาเพื่อช่วยเหลือภรรยาที่คลอดบุตร",
        defaultDays: 15,
        requiresMedicalCert: false,
      },
      {
        name: "ลากิจเลี้ยงดูบุตร",
        code: "childcare",
        description: "การลาเพื่อเลี้ยงดูบุตร",
        defaultDays: 150,
        requiresMedicalCert: false,
      },
      {
        name: "ลาอุปสมบท/ฮัจย์",
        code: "ordination",
        description: "การลาเพื่ออุปสมบทหรือประกอบพิธีฮัจย์",
        defaultDays: 120,
        requiresMedicalCert: false,
      },
      {
        name: "ลาตรวจเลือก",
        code: "military",
        description: "การลาเพื่อตรวจเลือกหรือเตรียมพล",
        defaultDays: 60,
        requiresMedicalCert: false,
      },
    ];

    for (const type of defaultTypes) {
      const exists = await LeaveType.findOne({ where: { code: type.code } });
      if (!exists) {
        await LeaveType.create(type);
      }
    }

    const leaveTypes = await LeaveType.findAll();
    res.json(leaveTypes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: process.env.NODE_ENV === "development" ? error.message : undefined });
  }
};

module.exports = {
  getLeaveTypes,
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  initializeLeaveTypes,
};
