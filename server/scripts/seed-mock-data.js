// ==============================================================================
// Script: สร้างชุดข้อมูลตัวอย่างที่สมจริงสำหรับนำเสนอโครงงาน (Realistic Mock Data)
// โครงงาน: ระบบบริหารจัดการการลาบุคลากร มหาวิทยาลัยราชภัฏบุรีรัมย์ (BRU LMS)
// รันคำสั่ง: node server/scripts/seed-mock-data.js
// ==============================================================================

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");

const {
  User,
  Faculty,
  Department,
  LeaveType,
  LeaveBalance,
  LeaveRequest,
  LeaveHistory,
  Notification,
} = require("../models");

async function seedRealisticMockData() {
  console.log("\n=======================================================");
  console.log(" 🚀 เริ่มต้นการสร้างข้อมูลจำลองสมจริงสำหรับนำเสนอโครงงาน...");
  console.log("=======================================================\n");

  const t = await sequelize.transaction();

  try {
    // -------------------------------------------------------------
    // 1. ค้นหาหน่วยงานและประเภทการลาที่ต้องใช้
    // -------------------------------------------------------------
    const sciDept = await Department.findOne({ where: { code: "SCI-IT" }, transaction: t });
    const csDept = await Department.findOne({ where: { code: "SCI-CS" }, transaction: t });
    const mathDept = await Department.findOne({ where: { code: "SCI-MATH" }, transaction: t });
    const adminDept = await Department.findOne({ where: { code: "ADMIN" }, transaction: t });
    const eduComDept = await Department.findOne({ where: { code: "EDU-COM" }, transaction: t });
    const eduEngDept = await Department.findOne({ where: { code: "EDU-ENG" }, transaction: t });
    const mngHrDept = await Department.findOne({ where: { code: "MNG-HR" }, transaction: t });

    const itDeptId = sciDept ? sciDept.id : 22;
    const adminDeptId = adminDept ? adminDept.id : 1;
    const mathDeptId = mathDept ? mathDept.id : itDeptId;
    const csDeptId = csDept ? csDept.id : itDeptId;
    const eduComDeptId = eduComDept ? eduComDept.id : itDeptId;
    const eduEngDeptId = eduEngDept ? eduEngDept.id : itDeptId;
    const mngHrDeptId = mngHrDept ? mngHrDept.id : itDeptId;

    const leaveTypes = await LeaveType.findAll({ transaction: t });
    const ltMap = {};
    leaveTypes.forEach((lt) => {
      ltMap[lt.code] = lt.id;
    });

    const defaultPassword = await bcrypt.hash("123456Az", 10);

    // -------------------------------------------------------------
    // 2. ปรับปรุงบัญชีผู้ใช้หลัก (Core Accounts) ให้ชื่อสมจริง เป็นทางการ
    // -------------------------------------------------------------
    console.log("👤 1. ปรับปรุงและสร้างข้อมูลบุคลากร...");

    // บัญชี 1: คุณธีรภัทร ชาญวิทย์ (Employee หลักสำหรับ Demo)
    let empUser = await User.findOne({ where: { email: "narongchai11500@gmail.com" }, transaction: t });
    if (empUser) {
      await empUser.update(
        {
          firstName: "ธีรภัทร",
          lastName: "ชาญวิทย์",
          departmentId: itDeptId,
          position: "อาจารย์ประจำสาขาวิชา",
          personnelType: "university_employee_academic",
          role: "employee",
          phone: "081-234-5678",
          startDate: "2021-06-01",
          governmentDivision: "สาขาวิชาเทคโนโลยีสารสนเทศ",
          documentNumber: "อว 0624.05/ว 142",
          unit: "สาขาวิชาเทคโนโลยีสารสนเทศ",
          affiliation: "คณะวิทยาศาสตร์",
          isActive: true,
        },
        { transaction: t }
      );
    }

    // บัญชี 2: หัวหน้าสาขา IT (Head Tier 1 Approver)
    let headUser = await User.findOne({ where: { email: "frankgucci67@gmail.com" }, transaction: t });
    if (headUser) {
      await headUser.update(
        {
          firstName: "วิทวัส",
          lastName: "สุวรรณโชติ",
          departmentId: itDeptId,
          position: "หัวหน้าสาขาวิชาเทคโนโลยีสารสนเทศ",
          personnelType: "civil_servant_academic",
          role: "head",
          phone: "089-765-4321",
          startDate: "2015-05-01",
          governmentDivision: "สาขาวิชาเทคโนโลยีสารสนเทศ",
          documentNumber: "อว 0624.05/ว 101",
          unit: "สาขาวิชาเทคโนโลยีสารสนเทศ",
          affiliation: "คณะวิทยาศาสตร์",
          signatureImage: "https://res.cloudinary.com/db8phgmgy/image/upload/v1791473665/leave_management/signatures/sig-2-frank-head.png",
          isActive: true,
        },
        { transaction: t }
      );
    }

    // ผูก Supervisor ให้ อ.ธีรภัทร เป็น ผศ.วิทวัส
    if (empUser && headUser) {
      await empUser.update({ supervisorId: headUser.id }, { transaction: t });
    }

    // บัญชี 9: ผู้ดูแลระบบ / กองบริหารงานบุคคล (Admin)
    let adminUser = await User.findOne({ where: { email: "leavemanagementbru@gmail.com" }, transaction: t });
    if (adminUser) {
      await adminUser.update(
        {
          firstName: "กิตติศักดิ์",
          lastName: "เจริญพร",
          departmentId: adminDeptId,
          position: "นักทรัพยากรบุคคล ชำนาญการพิเศษ",
          personnelType: "civil_servant_support",
          role: "admin",
          phone: "044-611221",
          governmentDivision: "กองบริหารงานบุคคล",
          documentNumber: "อว 0624.01/ว 088",
          unit: "กองบริหารงานบุคคล",
          affiliation: "สำนักงานอธิการบดี",
          isActive: true,
        },
        { transaction: t }
      );
    }

    // บัญชี 16: คณบดีคณะวิทยาศาสตร์ (Dean Tier 2 Approver)
    let deanUser = await User.findOne({ where: { email: "stu31779@nangrong.ac.th" }, transaction: t });
    if (deanUser) {
      await deanUser.update(
        {
          firstName: "สมชาย",
          lastName: "วงศ์สวัสดิ์",
          departmentId: itDeptId,
          position: "คณบดีคณะวิทยาศาสตร์",
          personnelType: "civil_servant_academic",
          role: "dean",
          phone: "084-555-8899",
          governmentDivision: "สำนักงานคณบดี",
          documentNumber: "อว 0624.05/พิเศษ",
          unit: "สำนักงานคณบดี",
          affiliation: "คณะวิทยาศาสตร์",
          isActive: true,
        },
        { transaction: t }
      );
    }

    // บัญชี 17: รองอธิการบดีฝ่ายบริหารงานบุคคลฯ (VP Tier 3 Authority)
    let vpUser = await User.findOne({ where: { email: "n.butthai.work@gmail.com" }, transaction: t });
    if (vpUser) {
      await vpUser.update(
        {
          firstName: "สุพจน์",
          lastName: "เมธาพรหม",
          departmentId: adminDeptId,
          position: "รองอธิการบดีฝ่ายบริหารงานบุคคลและเทคโนโลยีสารสนเทศ",
          personnelType: "civil_servant_academic",
          role: "vp",
          phone: "044-611221",
          governmentDivision: "สำนักงานอธิการบดี",
          documentNumber: "อว 0624/พิเศษ",
          unit: "สำนักงานอธิการบดี",
          affiliation: "มหาวิทยาลัยราชภัฏบุรีรัมย์",
          isActive: true,
        },
        { transaction: t }
      );
    }

    // -------------------------------------------------------------
    // 3. สร้างบุคลากรตัวอย่างเพิ่มเติม ครอบคลุม 5 ประเภทตามระเบียบ
    // -------------------------------------------------------------
    const extraUsersData = [
      {
        employeeId: "BRU-01024",
        email: "anon.math@bru.ac.th",
        password: defaultPassword,
        firstName: "อานนท์",
        lastName: "ภาคสถิตย์",
        departmentId: mathDeptId,
        position: "อาจารย์ประจำสาขาวิชาคณิตศาสตร์",
        personnelType: "civil_servant_academic", // 1. ข้าราชการสายผู้สอน
        role: "employee",
        phone: "086-112-3344",
        startDate: "2013-05-01",
        governmentDivision: "สาขาวิชาคณิตศาสตร์",
        documentNumber: "อว 0624.05/ว 045",
        unit: "สาขาวิชาคณิตศาสตร์",
        affiliation: "คณะวิทยาศาสตร์",
      },
      {
        employeeId: "BRU-02058",
        email: "siriporn.sci@bru.ac.th",
        password: defaultPassword,
        firstName: "ศิริพร",
        lastName: "บุญรักษา",
        departmentId: itDeptId,
        position: "นักวิชาการศึกษา ชำนาญการ",
        personnelType: "civil_servant_support", // 2. ข้าราชการสายสนับสนุน
        role: "employee",
        phone: "082-334-5566",
        startDate: "2016-08-01",
        governmentDivision: "สาขาวิชาเทคโนโลยีสารสนเทศ",
        documentNumber: "อว 0624.05/ว 072",
        unit: "สาขาวิชาเทคโนโลยีสารสนเทศ",
        affiliation: "คณะวิทยาศาสตร์",
      },
      {
        employeeId: "BRU-03112",
        email: "chayanin.edu@bru.ac.th",
        password: defaultPassword,
        firstName: "ชญานิน",
        lastName: "อินทร์สุวรรณ",
        departmentId: eduEngDeptId,
        position: "อาจารย์ประจำสาขาวิชาภาษาอังกฤษ",
        personnelType: "university_employee_academic", // 3. พนักงานมหาวิทยาลัยสายผู้สอน
        role: "employee",
        phone: "087-998-1122",
        startDate: "2019-07-01",
        governmentDivision: "สาขาวิชาภาษาอังกฤษ",
        documentNumber: "อว 0624.03/ว 115",
        unit: "สาขาวิชาภาษาอังกฤษ",
        affiliation: "คณะครุศาสตร์",
      },
      {
        employeeId: "BRU-04205",
        email: "sudarat.hr@bru.ac.th",
        password: defaultPassword,
        firstName: "สุดารัตน์",
        lastName: "รักษ์ดี",
        departmentId: mngHrDeptId,
        position: "เจ้าหน้าที่บริหารงานทั่วไป",
        personnelType: "university_employee_support", // 4. พนักงานมหาวิทยาลัยสายสนับสนุน
        role: "employee",
        phone: "085-443-2211",
        startDate: "2020-02-01",
        governmentDivision: "สาขาวิชาการจัดการทรัพยากรมนุษย์",
        documentNumber: "อว 0624.04/ว 063",
        unit: "สาขาวิชาการจัดการทรัพยากรมนุษย์",
        affiliation: "คณะวิทยาการจัดการ",
      },
      {
        employeeId: "BRU-05018",
        email: "worameth.cs@bru.ac.th",
        password: defaultPassword,
        firstName: "วรเมธ",
        lastName: "รัตนเกียรติ",
        departmentId: csDeptId,
        position: "อาจารย์อัตราจ้าง",
        personnelType: "contract_lecturer", // 5. อาจารย์อัตราจ้าง
        role: "employee",
        phone: "083-667-8899",
        startDate: "2023-06-01",
        governmentDivision: "สาขาวิชาวิทยาการคอมพิวเตอร์",
        unit: "สาขาวิชาวิทยาการคอมพิวเตอร์",
        affiliation: "คณะวิทยาศาสตร์",
      },
      {
        employeeId: "BRU-06004",
        email: "sommai.edu@bru.ac.th",
        password: defaultPassword,
        firstName: "สมหมาย",
        lastName: "มุ่งมั่น",
        departmentId: eduComDeptId,
        position: "พนักงานบริการทั่วไป",
        personnelType: "temporary_employee", // 6. ลูกจ้างชั่วคราว
        role: "employee",
        phone: "088-776-5544",
        startDate: "2022-10-01",
        governmentDivision: "สาขาวิชาคอมพิวเตอร์ศึกษา",
        documentNumber: "อว 0624.03/ว 021",
        unit: "สาขาวิชาคอมพิวเตอร์ศึกษา",
      },
    ];

    const allSeededUsers = [];
    if (empUser) allSeededUsers.push(empUser);
    if (headUser) allSeededUsers.push(headUser);
    if (deanUser) allSeededUsers.push(deanUser);
    if (vpUser) allSeededUsers.push(vpUser);
    if (adminUser) allSeededUsers.push(adminUser);

    for (const uData of extraUsersData) {
      let u = await User.findOne({ where: { email: uData.email }, transaction: t });
      if (!u) {
        u = await User.create(
          {
            ...uData,
            affiliation: "มหาวิทยาลัยราชภัฏบุรีรัมย์",
            isActive: true,
          },
          { transaction: t }
        );
      } else {
        await u.update(uData, { transaction: t });
      }
      allSeededUsers.push(u);
    }

    console.log(`✅ บุคลากรในระบบพร้อมใช้งานทั้งหมด ${allSeededUsers.length} ท่าน (ครบทั้ง 5 ประเภทตามระเบียบ)`);

    // -------------------------------------------------------------
    // 4. ล้างข้อมูลใบลาเก่า (เฉพาะที่เป็นข้อมูลทดสอบ กฟฟก / นนนนน / test)
    // -------------------------------------------------------------
    console.log("🧹 2. ล้างข้อมูลคำขอลาเก่าและรีเซ็ตประวัติ...");
    await LeaveHistory.destroy({ where: {}, transaction: t });
    await Notification.destroy({ where: {}, transaction: t });
    await LeaveRequest.destroy({ where: {}, transaction: t });
    await LeaveBalance.update({ usedDays: 0 }, { where: {}, transaction: t });

    // -------------------------------------------------------------
    // 5. สร้าง LeaveBalance สำหรับปี 2026 และ 2027 ให้บุคลากรทุกคน
    // -------------------------------------------------------------
    console.log("⚖️  3. ตั้งค่าโควตาวันลา (Leave Balances) ปีงบประมาณ 2569 และ 2570...");
    const years = [2026, 2027];

    for (const user of allSeededUsers) {
      for (const yr of years) {
        for (const lt of leaveTypes) {
          let carriedOver = 0;
          // วันลาพักผ่อนสะสมตามอายุงาน
          if (lt.code === "vacation") {
            if (user.personnelType === "civil_servant_academic" || user.personnelType === "civil_servant_support") {
              carriedOver = 10; // ข้าราชการสะสมได้สูงสุด 10-20 วัน
            } else if (user.personnelType.includes("university_employee")) {
              carriedOver = 5; // พนักงานมหาวิทยาลัยสะสมได้ 5 วัน
            }
          }

          await LeaveBalance.findOrCreate({
            where: {
              userId: user.id,
              leaveTypeId: lt.id,
              year: yr,
            },
            defaults: {
              totalDays: lt.defaultDays,
              usedDays: 0,
              carriedOverDays: carriedOver,
            },
            transaction: t,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // 6. สร้างคำขอลาจำลองที่สมจริง (Realistic Leave Requests)
    // -------------------------------------------------------------
    console.log("📋 4. สร้างชุดข้อมูลคำขอลาตัวอย่างที่เป็นทางการ...");

    // ค้นหา user object ที่สร้างแล้ว
    const uEmp = allSeededUsers.find((x) => x.email === "narongchai11500@gmail.com") || empUser;
    const uHead = allSeededUsers.find((x) => x.email === "frankgucci67@gmail.com") || headUser;
    const uDean = allSeededUsers.find((x) => x.email === "stu31779@nangrong.ac.th") || deanUser;
    const uVp = allSeededUsers.find((x) => x.email === "n.butthai.work@gmail.com") || vpUser;
    const uAdmin = allSeededUsers.find((x) => x.email === "leavemanagementbru@gmail.com") || adminUser;

    const uAnon = allSeededUsers.find((x) => x.email === "anon.math@bru.ac.th");
    const uSiriporn = allSeededUsers.find((x) => x.email === "siriporn.sci@bru.ac.th");
    const uChayanin = allSeededUsers.find((x) => x.email === "chayanin.edu@bru.ac.th");
    const uSudarat = allSeededUsers.find((x) => x.email === "sudarat.hr@bru.ac.th");
    const uWorameth = allSeededUsers.find((x) => x.email === "worameth.cs@bru.ac.th");
    const uSommai = allSeededUsers.find((x) => x.email === "sommai.edu@bru.ac.th");

    const leaveRequestsData = [
      // -----------------------------------------------------------
      // กลุ่มของ อ.ธีรภัทร ชาญวิทย์ (สำหรับใช้ Demo สดในวันพรุ่งนี้ - ปี 2570)
      // -----------------------------------------------------------
      // รายการที่ 1: สถานะ pending -> เพื่อให้สลับไปบัญชี Head กดอนุมัติสดๆ ให้กรรมการดู
      {
        userId: uEmp.id,
        leaveTypeId: ltMap["vacation"],
        startDate: "2027-02-18",
        endDate: "2027-02-19",
        totalDays: 2.0,
        timeSlot: "full",
        reason: "ขอลาพักผ่อนประจำปีเพื่อเดินทางกลับภูมิลำเนาและดูแลครอบครัว ณ ต่างจังหวัด",
        contactAddress: "123/45 ถนนจิระ ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์ 31000",
        contactPhone: "081-234-5678",
        status: "pending",
        histories: [
          {
            action: "created",
            actionBy: uEmp.id,
            oldStatus: null,
            newStatus: "pending",
            note: "ยื่นคำขอลาพักผ่อนผ่านระบบอิเล็กทรอนิกส์",
          },
        ],
      },
      // รายการที่ 2: สถานะ pending_dean -> ผ่าน Head แล้ว รอคณบดีพิจารณา
      {
        userId: uEmp.id,
        leaveTypeId: ltMap["personal"],
        startDate: "2027-02-23",
        endDate: "2027-02-23",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "เดินทางไปติดต่อราชการและทำนิติกรรมโอนกรรมสิทธิ์ที่ดิน ณ สำนักงานที่ดินจังหวัดบุรีรัมย์",
        contactAddress: "123/45 ถนนจิระ ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์ 31000",
        contactPhone: "081-234-5678",
        status: "pending_dean",
        headComment: "เห็นชอบตามเสนอ",
        headApprovedBy: uHead.id,
        headApprovedAt: new Date("2027-02-16T09:30:00"),
        approvedBy: uHead.id,
        approvedAt: new Date("2027-02-16T09:30:00"),
        histories: [
          {
            action: "created",
            actionBy: uEmp.id,
            oldStatus: null,
            newStatus: "pending",
            note: "ยื่นคำขอลากิจส่วนตัวผ่านระบบ",
          },
          {
            action: "approved",
            actionBy: uHead.id,
            oldStatus: "pending",
            newStatus: "pending_dean",
            note: "หัวหน้าสาขาวิชาเทคโนโลยีสารสนเทศให้ความเห็นชอบและส่งต่อคณบดี",
          },
        ],
      },
      // รายการที่ 3: สถานะ confirmed -> ยืนยันตัดยอดแล้ว ใช้กดเปิด "ดูใบลา PDF" โชว์ฟอร์มทางการ
      {
        userId: uEmp.id,
        leaveTypeId: ltMap["sick"],
        startDate: "2027-01-14",
        endDate: "2027-01-14",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "มีอาการไข้หวัด ปวดศีรษะ และไอ",
        contactAddress: "123/45 ถนนจิระ ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์ 31000",
        contactPhone: "081-234-5678",
        status: "confirmed",
        headComment: "รับทราบและเห็นชอบตามเสนอ",
        headApprovedBy: uHead.id,
        headApprovedAt: new Date("2027-01-14T10:00:00"),
        approvedBy: uHead.id,
        approvedAt: new Date("2027-01-14T10:00:00"),
        deanComment: "เห็นควรอนุญาต",
        deanApprovedBy: uDean.id,
        deanApprovedAt: new Date("2027-01-14T13:30:00"),
        vpDecision: "allow",
        vpComment: "อนุญาตตามระเบียบ",
        vpApprovedBy: uVp.id,
        vpApprovedAt: new Date("2027-01-14T15:00:00"),
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-01-15T09:00:00"),
        confirmedNote: "ลงบันทึกข้อมูลและตัดยอดวันลาเรียบร้อยแล้ว",
        histories: [
          { action: "created", actionBy: uEmp.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาป่วย" },
          { action: "approved", actionBy: uHead.id, oldStatus: "pending", newStatus: "pending_dean", note: "หัวหน้าสาขาให้ความเห็นชอบ" },
          { action: "approved", actionBy: uDean.id, oldStatus: "pending_dean", newStatus: "pending_vp", note: "คณบดีให้ความเห็นชอบ" },
          { action: "approved", actionBy: uVp.id, oldStatus: "pending_vp", newStatus: "approved", note: "รองอธิการบดีฯ มีคำสั่งอนุญาต" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "กองบริหารงานบุคคลลงบันทึกตัดยอด" },
        ],
      },
      // รายการที่ 4: สถานะ rejected -> โชว์กรณีที่ถูกปฏิเสธพร้อมเหตุผล
      {
        userId: uEmp.id,
        leaveTypeId: ltMap["vacation"],
        startDate: "2027-03-08",
        endDate: "2027-03-09",
        totalDays: 2.0,
        timeSlot: "full",
        reason: "ขอลาพักผ่อนเพื่อท่องเที่ยวพักผ่อนประจำปี",
        contactAddress: "123/45 ถนนจิระ ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "081-234-5678",
        status: "rejected",
        rejectionReason: "ตรงกับช่วงจัดสอบกลางภาคของสาขาวิชา ขอให้ปรับเปลี่ยนช่วงเวลาการลาเป็นหลังเสร็จสิ้นการจัดสอบ",
        headComment: "ตรงกับช่วงจัดสอบกลางภาคของสาขาวิชา ขอให้ปรับเปลี่ยนช่วงเวลาการลาเป็นหลังเสร็จสิ้นการจัดสอบ",
        headApprovedBy: uHead.id,
        headApprovedAt: new Date("2027-03-05T11:00:00"),
        histories: [
          { action: "created", actionBy: uEmp.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาพักผ่อน" },
          { action: "rejected", actionBy: uHead.id, oldStatus: "pending", newStatus: "rejected", note: "หัวหน้าสาขาวิชาไม่อนุมัติเนื่องจากตรงกับช่วงสอบกลางภาค" },
        ],
      },

      // -----------------------------------------------------------
      // ข้อมูลของบุคลากรท่านอื่น ๆ ประจำปี 2570 (2027)
      // -----------------------------------------------------------
      // ผศ.ดร.อานนท์ (ข้าราชการสายผู้สอน - คณะวิทย์): ลาพักผ่อน 5 วัน
      {
        userId: uAnon.id,
        leaveTypeId: ltMap["vacation"],
        startDate: "2027-01-18",
        endDate: "2027-01-22",
        totalDays: 5.0,
        timeSlot: "full",
        reason: "ลาพักผ่อนประจำปีเพื่อเดินทางไปเยี่ยมบิดามารดาและทัศนศึกษาทางวิชาการ ณ จังหวัดเชียงใหม่",
        contactAddress: "99 หมู่ 2 ตำบลเสม็ด อำเภอเมือง จังหวัดบุรีรัมย์ 31000",
        contactPhone: "086-112-3344",
        status: "confirmed",
        headApprovedBy: uHead.id,
        headApprovedAt: new Date("2027-01-12T09:00:00"),
        deanApprovedBy: uDean.id,
        deanApprovedAt: new Date("2027-01-12T14:00:00"),
        vpApprovedBy: uVp.id,
        vpApprovedAt: new Date("2027-01-13T10:00:00"),
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-01-13T15:00:00"),
        histories: [
          { action: "created", actionBy: uAnon.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาพักผ่อน" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "อนุมัติและตัดยอดเรียบร้อย" },
        ],
      },
      // ผศ.ดร.อานนท์: รายการสถานะ approved รอ Admin confirm ในหน้า Admin Leaves
      {
        userId: uAnon.id,
        leaveTypeId: ltMap["personal"],
        startDate: "2027-03-15",
        endDate: "2027-03-15",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "เข้ารับการตรวจสุขภาพประจำปี ณ โรงพยาบาลบุรีรัมย์",
        contactAddress: "99 หมู่ 2 ตำบลเสม็ด อำเภอเมือง จังหวัดบุรีรัมย์ 31000",
        contactPhone: "086-112-3344",
        status: "approved",
        headComment: "เห็นชอบตามเสนอ",
        headApprovedBy: uHead.id,
        headApprovedAt: new Date("2027-03-10T10:00:00"),
        deanComment: "เห็นควรอนุญาต",
        deanApprovedBy: uDean.id,
        deanApprovedAt: new Date("2027-03-10T14:00:00"),
        vpDecision: "allow",
        vpComment: "อนุญาต",
        vpApprovedBy: uVp.id,
        vpApprovedAt: new Date("2027-03-11T11:00:00"),
        histories: [
          { action: "created", actionBy: uAnon.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลากิจส่วนตัว" },
          { action: "approved", actionBy: uVp.id, oldStatus: "pending_vp", newStatus: "approved", note: "รองอธิการบดีฯ มีคำสั่งอนุญาต (รอฝ่ายบุคคลยืนยัน)" },
        ],
      },
      // ผศ.ดร.อานนท์: ลากิจ 1 วัน
      {
        userId: uAnon.id,
        leaveTypeId: ltMap["personal"],
        startDate: "2027-05-18",
        endDate: "2027-05-18",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "ติดต่อประสานงานวิจัย ณ มหาวิทยาลัยเครือข่าย",
        contactAddress: "99 หมู่ 2 ตำบลเสม็ด อำเภอเมือง จังหวัดบุรีรัมย์ 31000",
        contactPhone: "086-112-3344",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-05-19T09:00:00"),
        histories: [
          { action: "created", actionBy: uAnon.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลากิจ" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกข้อมูลเรียบร้อย" },
        ],
      },
      // นางสาวศิริพร (ข้าราชการสายสนับสนุน - คณะวิทย์): ลาป่วย 2 วัน
      {
        userId: uSiriporn.id,
        leaveTypeId: ltMap["sick"],
        startDate: "2027-04-20",
        endDate: "2027-04-21",
        totalDays: 2.0,
        timeSlot: "full",
        reason: "มีอาการอาหารเป็นพิษเฉียบพลัน",
        contactAddress: "45/1 ถนนรมย์บุรี ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "082-334-5566",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-04-22T09:00:00"),
        histories: [
          { action: "created", actionBy: uSiriporn.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาป่วย" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
      // นางสาวศิริพร: ลาพักผ่อน 3 วัน
      {
        userId: uSiriporn.id,
        leaveTypeId: ltMap["vacation"],
        startDate: "2027-06-16",
        endDate: "2027-06-18",
        totalDays: 3.0,
        timeSlot: "full",
        reason: "ลาพักผ่อนประจำปีเพื่อดูแลครอบครัว",
        contactAddress: "45/1 ถนนรมย์บุรี ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "082-334-5566",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-06-19T09:00:00"),
        histories: [
          { action: "created", actionBy: uSiriporn.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาพักผ่อน" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
      // อาจารย์ชญานิน (พนักงานสายผู้สอน - ครุศาสตร์): ลาพักผ่อน 2 วัน (สถานะ pending_vp รอรองอธิการบดี)
      {
        userId: uChayanin.id,
        leaveTypeId: ltMap["vacation"],
        startDate: "2027-05-10",
        endDate: "2027-05-11",
        totalDays: 2.0,
        timeSlot: "full",
        reason: "ขอลาพักผ่อนประจำปีเพื่อพาบิดาไปตรวจสุขภาพ ณ โรงพยาบาลศูนย์",
        contactAddress: "88 ถนนธานี ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "087-998-1122",
        status: "pending_vp",
        headComment: "เห็นชอบตามเสนอ จัดการสอนชดเชยเรียบร้อย",
        headApprovedBy: uHead.id,
        headApprovedAt: new Date("2027-05-06T09:00:00"),
        deanComment: "เห็นชอบเสนอรองอธิการบดีฯ เพื่อโปรดพิจารณา",
        deanApprovedBy: uDean.id,
        deanApprovedAt: new Date("2027-05-07T11:00:00"),
        histories: [
          { action: "created", actionBy: uChayanin.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาพักผ่อน" },
          { action: "approved", actionBy: uDean.id, oldStatus: "pending_dean", newStatus: "pending_vp", note: "คณบดีให้ความเห็นชอบและส่งต่อรองอธิการบดี" },
        ],
      },
      // อาจารย์ชญานิน: ลากิจ 1 วัน
      {
        userId: uChayanin.id,
        leaveTypeId: ltMap["personal"],
        startDate: "2027-07-08",
        endDate: "2027-07-08",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "เข้าร่วมงานพิธีมงคลสมรสของญาติสนิท",
        contactAddress: "88 ถนนธานี ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "087-998-1122",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-07-09T09:00:00"),
        histories: [
          { action: "created", actionBy: uChayanin.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลากิจ" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
      // นางสาวสุดารัตน์ (พนักงานสายสนับสนุน - วิทยาการจัดการ): ลากิจ 1 วัน
      {
        userId: uSudarat.id,
        leaveTypeId: ltMap["personal"],
        startDate: "2027-06-02",
        endDate: "2027-06-02",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "เข้าร่วมพิธีพระราชทานปริญญาบัตรของน้องสาว",
        contactAddress: "12 หมู่ 4 ตำบลกระสัง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "085-443-2211",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-06-03T10:00:00"),
        histories: [
          { action: "created", actionBy: uSudarat.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลากิจ" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกข้อมูลเรียบร้อย" },
        ],
      },
      // นางสาวสุดารัตน์: ลาพักผ่อน 4 วัน
      {
        userId: uSudarat.id,
        leaveTypeId: ltMap["vacation"],
        startDate: "2027-08-03",
        endDate: "2027-08-06",
        totalDays: 4.0,
        timeSlot: "full",
        reason: "ลาพักผ่อนประจำปีเพื่อพาครอบครัวท่องเที่ยวต่างจังหวัด",
        contactAddress: "12 หมู่ 4 ตำบลกระสัง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "085-443-2211",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-08-07T10:00:00"),
        histories: [
          { action: "created", actionBy: uSudarat.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาพักผ่อน" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
      // นายวรเมธ (อาจารย์อัตราจ้าง - วิทยาการคอมพิวเตอร์): ลาช่วยภรรยาคลอด 5 วัน
      {
        userId: uWorameth.id,
        leaveTypeId: ltMap["paternity"],
        startDate: "2027-07-12",
        endDate: "2027-07-16",
        totalDays: 5.0,
        timeSlot: "full",
        reason: "ภริยาคลอดบุตร ณ โรงพยาบาลบุรีรัมย์",
        contactAddress: "34 ถนนอินจันทร์ณรงค์ ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "083-667-8899",
        status: "confirmed",
        headComment: "เห็นชอบตามสิทธิระเบียบการลา",
        headApprovedBy: uHead.id,
        headApprovedAt: new Date("2027-07-08T09:00:00"),
        deanComment: "เห็นชอบ",
        deanApprovedBy: uDean.id,
        deanApprovedAt: new Date("2027-07-08T13:00:00"),
        vpDecision: "allow",
        vpComment: "อนุญาตตามสิทธิ",
        vpApprovedBy: uVp.id,
        vpApprovedAt: new Date("2027-07-09T16:00:00"),
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-07-10T09:30:00"),
        histories: [
          { action: "created", actionBy: uWorameth.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาช่วยภริยาคลอดบุตร" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกและตัดยอดวันลา" },
        ],
      },
      // นายสมหมาย (ลูกจ้างชั่วคราว - ครุศาสตร์): ลาป่วย 1 วัน
      {
        userId: uSommai.id,
        leaveTypeId: ltMap["sick"],
        startDate: "2027-08-23",
        endDate: "2027-08-23",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "มีอาการปวดกล้ามเนื้อหลังเฉียบพลันจากการยกของหนัก",
        contactAddress: "56 หมู่ 8 ตำบลบ้านบัว อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "088-776-5544",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-08-24T08:30:00"),
        histories: [
          { action: "created", actionBy: uSommai.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาป่วย" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
      // นายสมหมาย: ลากิจ 1 วัน
      {
        userId: uSommai.id,
        leaveTypeId: ltMap["personal"],
        startDate: "2027-09-14",
        endDate: "2027-09-14",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "เดินทางไปต่ออายุใบอนุญาตขับขี่และติดต่อราชการ",
        contactAddress: "56 หมู่ 8 ตำบลบ้านบัว อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "088-776-5544",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2027-09-15T08:30:00"),
        histories: [
          { action: "created", actionBy: uSommai.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลากิจ" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },

      // -----------------------------------------------------------
      // ข้อมูลประวัติย้อนหลังของปี 2569 (2026) เพื่อไม่ให้ปีก่อนหน้าว่างเปล่า
      // -----------------------------------------------------------
      {
        userId: uEmp.id,
        leaveTypeId: ltMap["sick"],
        startDate: "2026-08-14",
        endDate: "2026-08-14",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "มีอาการหวัดคัดจมูก",
        contactAddress: "123/45 ถนนจิระ ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "081-234-5678",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2026-08-15T09:00:00"),
        histories: [
          { action: "created", actionBy: uEmp.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาป่วย" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
      {
        userId: uAnon.id,
        leaveTypeId: ltMap["vacation"],
        startDate: "2026-07-20",
        endDate: "2026-07-24",
        totalDays: 5.0,
        timeSlot: "full",
        reason: "ลาพักผ่อนประจำปี",
        contactAddress: "99 หมู่ 2 ตำบลเสม็ด อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "086-112-3344",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2026-07-25T09:00:00"),
        histories: [
          { action: "created", actionBy: uAnon.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาพักผ่อน" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
      {
        userId: uSiriporn.id,
        leaveTypeId: ltMap["sick"],
        startDate: "2026-09-10",
        endDate: "2026-09-10",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "ปวดฟันและพบทันตแพทย์",
        contactAddress: "45/1 ถนนรมย์บุรี ตำบลในเมือง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "082-334-5566",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2026-09-11T09:00:00"),
        histories: [
          { action: "created", actionBy: uSiriporn.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลาป่วย" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
      {
        userId: uSudarat.id,
        leaveTypeId: ltMap["personal"],
        startDate: "2026-09-15",
        endDate: "2026-09-15",
        totalDays: 1.0,
        timeSlot: "full",
        reason: "ติดต่อราชการสำนักงานที่ดิน",
        contactAddress: "12 หมู่ 4 ตำบลกระสัง อำเภอเมือง จังหวัดบุรีรัมย์",
        contactPhone: "085-443-2211",
        status: "confirmed",
        confirmedBy: uAdmin.id,
        confirmedAt: new Date("2026-09-16T09:00:00"),
        histories: [
          { action: "created", actionBy: uSudarat.id, oldStatus: null, newStatus: "pending", note: "ยื่นคำขอลากิจ" },
          { action: "confirmed", actionBy: uAdmin.id, oldStatus: "approved", newStatus: "confirmed", note: "ลงบันทึกเรียบร้อย" },
        ],
      },
    ];

    for (const item of leaveRequestsData) {
      const { histories, ...requestFields } = item;
      const createdReq = await LeaveRequest.create(requestFields, { transaction: t });

      // บันทึก Leave History
      if (histories && histories.length > 0) {
        for (const h of histories) {
          await LeaveHistory.create(
            {
              leaveRequestId: createdReq.id,
              action: h.action,
              actionBy: h.actionBy,
              oldStatus: h.oldStatus,
              newStatus: h.newStatus,
              note: h.note,
            },
            { transaction: t }
          );
        }
      }

      // ถ้าเป็น confirmed ให้คำนวณหัก usedDays ใน LeaveBalance ของปีงบประมาณนั้น
      if (createdReq.status === "confirmed") {
        const d = new Date(createdReq.startDate);
        const fiscalYear = d.getMonth() >= 9 ? d.getFullYear() + 1 : d.getFullYear();

        await LeaveBalance.increment("usedDays", {
          by: parseFloat(createdReq.totalDays),
          where: {
            userId: createdReq.userId,
            leaveTypeId: createdReq.leaveTypeId,
            year: fiscalYear,
          },
          transaction: t,
        });
      }
    }

    console.log(`✅ สร้างคำขอลาตัวอย่างทั้งหมด ${leaveRequestsData.length} รายการ (ครบทุกสถานะ: pending, pending_dean, pending_vp, approved, confirmed, rejected)`);

    // -------------------------------------------------------------
    // 7. สร้างการแจ้งเตือน (Notifications) ให้ผู้ใช้งาน
    // -------------------------------------------------------------
    console.log("🔔 5. สร้างประวัติการแจ้งเตือน (Notifications)...");
    const notificationsData = [
      {
        userId: uEmp.id,
        type: "confirmation",
        title: "ใบลาได้รับการยืนยันเรียบร้อยแล้ว",
        message: "คำขอลาป่วย วันที่ 14/01/2570 ได้รับการลงบันทึกเข้าสู่ระบบโดยกองบริหารงานบุคคลเรียบร้อยแล้ว",
        isRead: true,
      },
      {
        userId: uEmp.id,
        type: "approval",
        title: "คำขอลาได้รับการอนุมัติ",
        message: "คำขอลากิจส่วนตัว วันที่ 23/02/2570 ผ่านการพิจารณาให้ความเห็นชอบจากหัวหน้าสาขาวิชาแล้ว",
        isRead: false,
      },
      {
        userId: uHead.id,
        type: "new_leave",
        title: "มีคำขอลาใหม่รอการพิจารณา",
        message: "อาจารย์ธีรภัทร ชาญวิทย์ ได้ยื่นคำขอลาพักผ่อน (18/02/2570 - 19/02/2570) รอการพิจารณาจากท่าน",
        isRead: false,
      },
      {
        userId: uDean.id,
        type: "approval",
        title: "มีคำขอลาเสนอต่อคณบดี",
        message: "มีคำขอลากิจส่วนตัวของ อาจารย์ธีรภัทร ชาญวิทย์ ผ่านความเห็นชอบจากหัวหน้าสาขาวิชา รอคณบดีพิจารณา",
        isRead: false,
      },
      {
        userId: uVp.id,
        type: "approval",
        title: "มีคำขอลาเสนอต่อรองอธิการบดีฯ",
        message: "มีคำขอลาพักผ่อนของ อาจารย์ชญานิน อินทร์สุวรรณ ผ่านความเห็นชอบจากคณบดี รอคำสั่งจากท่าน",
        isRead: false,
      },
      {
        userId: uAdmin.id,
        type: "new_leave",
        title: "มีใบลาที่ได้รับอนุมัติรอการยืนยันตัดยอด",
        message: "คำขอลากิจส่วนตัวของ ผศ.ดร.อานนท์ ภาคสถิตย์ ได้รับการอนุมัติแล้ว รอการยืนยันลงบันทึกในระบบ",
        isRead: false,
      },
    ];

    for (const notif of notificationsData) {
      await Notification.create(notif, { transaction: t });
    }
    console.log(`✅ สร้างการแจ้งเตือนทั้งหมด ${notificationsData.length} รายการ`);

    await t.commit();

    console.log("\n=======================================================");
    console.log(" 🎉 สร้างชุดข้อมูลจำลองสมจริง (Mock Data) สำเร็จเรียบร้อย!");
    console.log("=======================================================\n");
    console.log("🔑 สรุปข้อมูลบัญชีสำหรับใช้สาธิต (Demo Accounts):");
    console.log("------------------------------------------------------------------");
    console.log("1. บุคลากรผู้ขอลา (Employee) :");
    console.log("   - Email: narongchai11500@gmail.com | รหัสผ่าน: 123456Az");
    console.log("   - ชื่อ: อาจารย์ธีรภัทร ชาญวิทย์ (สาขาวิชา IT คณะวิทยาศาสตร์)");
    console.log("2. หัวหน้าสาขาวิชา (Head Tier 1) :");
    console.log("   - Email: frankgucci67@gmail.com | รหัสผ่าน: 123456Az");
    console.log("   - ชื่อ: ผศ.วิทวัส สุวรรณโชติ (หัวหน้าสาขาวิชา IT)");
    console.log("3. คณบดีคณะวิทยาศาสตร์ (Dean Tier 2) :");
    console.log("   - Email: stu31779@nangrong.ac.th | รหัสผ่าน: 123456Az");
    console.log("   - ชื่อ: รศ.ดร.สมชาย วงศ์สวัสดิ์ (คณบดีคณะวิทยาศาสตร์)");
    console.log("4. รองอธิการบดีฝ่ายบริหารบุคคล (VP Tier 3) :");
    console.log("   - Email: n.butthai.work@gmail.com | รหัสผ่าน: 123456Az");
    console.log("   - ชื่อ: ผศ.ดร.สุพจน์ เมธาพรหม (รองอธิการบดีฯ)");
    console.log("5. ผู้ดูแลระบบ/กองบริหารงานบุคคล (Admin) :");
    console.log("   - Email: leavemanagementbru@gmail.com | รหัสผ่าน: 123456Az");
    console.log("   - ชื่อ: นายกิตติศักดิ์ เจริญพร (กองบริหารงานบุคคล)");
    console.log("------------------------------------------------------------------\n");

    process.exit(0);
  } catch (err) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error("❌ เกิดข้อผิดพลาดในการสร้าง Mock Data:", err.message);
    console.error(err);
    process.exit(1);
  }
}

seedRealisticMockData();
