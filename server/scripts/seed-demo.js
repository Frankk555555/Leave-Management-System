// Local development fixtures. Creates missing demo records without resetting data.
require("dotenv").config();
const fs = require("node:fs/promises");
const path = require("node:path");
const PDFDocument = require("pdfkit");
const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const { getFiscalYear } = require("../services/leaveValidationService");
const { User, Faculty, Department, LeaveType, LeaveBalance, LeaveRequest,
  LeaveHistory, LeaveAttachment, Holiday, Notification } = require("../models");

const PASSWORD = "Demo123!";
const DAY = 86400000;
const key = (date) => date.toISOString().slice(0, 10);
const shift = (date, days) => new Date(date.getTime() + days * DAY);
const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
const reference = new Date(`${process.env.DEMO_DATE || todayKey}T12:00:00Z`);
const year = reference.getUTCFullYear();
const fiscalYear = getFiscalYear(reference);
const personnelTypes = ["civil_servant_academic", "civil_servant_support", "university_employee_academic",
  "university_employee_support", "contract_lecturer", "temporary_employee"];
const statuses = ["pending", "pending_dean", "pending_vp", "approved", "confirmed", "rejected", "cancelled"];
const faculties = [
  ["SCI", "คณะวิทยาศาสตร์", "faculty", "วิทยาการคอมพิวเตอร์", "เทคโนโลยีสารสนเทศ"],
  ["EDU", "คณะครุศาสตร์", "faculty", "คอมพิวเตอร์ศึกษา", "การศึกษาปฐมวัย"],
  ["HUM", "คณะมนุษยศาสตร์และสังคมศาสตร์", "faculty", "ภาษาอังกฤษ", "รัฐประศาสนศาสตร์"],
  ["MNG", "คณะวิทยาการจัดการ", "faculty", "การบัญชี", "การตลาด"],
  ["ADMIN", "สำนักงานอธิการบดี", "office", "งานบริหารบุคคล", "งานการเงิน"],
  ["DEMO-INST", "สถาบันวิจัยและพัฒนา", "institute", "งานวิจัย", "งานบริการวิชาการ"],
];
const leaveTypes = [
  ["sick", "ลาป่วย", 60], ["personal", "ลากิจส่วนตัว", 45], ["vacation", "ลาพักผ่อน", 10],
  ["maternity", "ลาคลอดบุตร", 90], ["paternity", "ลาช่วยภรรยาคลอด", 15],
  ["childcare", "ลาเลี้ยงดูบุตร", 150], ["ordination", "ลาอุปสมบท/ฮัจย์", 120], ["military", "ลาตรวจเลือก", 60],
];

async function ensureFiles() {
  const dir = path.join(__dirname, "../uploads/demo");
  await fs.mkdir(dir, { recursive: true });
  for (const name of ["avatar.png", "signature.png"]) {
    const destination = path.join(dir, name);
    try { await fs.access(destination); }
    catch { await fs.copyFile(path.join(__dirname, "fixtures", name), destination); }
  }
  const file = path.join(dir, "supporting-document.pdf");
  try { await fs.access(file); }
  catch {
    const doc = new PDFDocument({ size: "A4", margin: 55 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve, reject) => { doc.on("end", resolve); doc.on("error", reject); });
    doc.fontSize(22).fillColor("#4f46a5").text("DEMO SUPPORTING DOCUMENT");
    doc.moveDown().fontSize(12).fillColor("#334155").text("TEST DATA ONLY - NOT AN OFFICIAL DOCUMENT");
    doc.moveDown().text("This sample attachment is provided to test leave request previews and downloads.");
    doc.moveDown().text("You can upload your own sample medical certificate or supporting evidence when submitting a new request.");
    doc.end();
    await finished;
    await fs.writeFile(file, Buffer.concat(chunks));
  }
  return (await fs.stat(file)).size;
}

async function seed() {
  if (process.env.NODE_ENV !== "development" || !["mysql", "localhost", "127.0.0.1"].includes(process.env.DB_HOST || "localhost")) {
    throw new Error("Demo seeding requires NODE_ENV=development and a local Docker/MySQL host.");
  }
  if (Number.isNaN(reference.getTime())) throw new Error("DEMO_DATE must be YYYY-MM-DD");
  // Docker's internal hostname is local; this connection does not require cloud SSL.
  sequelize.options.dialectOptions.ssl = false;
  await sequelize.authenticate();
  const fileSize = await ensureFiles();
  const summary = await sequelize.transaction(async (transaction) => {
    const options = { transaction };
    const ensure = async (Model, where, defaults) => (await Model.findOrCreate({ where, defaults, ...options }))[0];
    const types = [];
    for (const [code, name, defaultDays] of leaveTypes) {
      types.push(await ensure(LeaveType, { code }, { name, defaultDays, requiresMedicalCert: code === "sick", isActive: true }));
    }
    const holidayKeys = new Set();
    for (const holidayYear of [year - 1, year, year + 1]) {
      for (const [monthDay, name, type, isHalfDay] of [
        ["01-01", "วันขึ้นปีใหม่ (ข้อมูลทดสอบ)", "national", false],
        ["04-13", "วันสงกรานต์ (ข้อมูลทดสอบ)", "national", false],
        ["04-14", "วันสงกรานต์ (ข้อมูลทดสอบ)", "national", false],
        ["04-15", "วันสงกรานต์ (ข้อมูลทดสอบ)", "national", false],
        ["05-01", "วันหยุดตัวอย่างสำหรับทดสอบ", "special", false],
        ["07-28", "วันหยุดตัวอย่างสำหรับทดสอบ", "national", false],
        ["08-12", "วันหยุดตัวอย่างสำหรับทดสอบ", "national", false],
        ["10-23", "วันหยุดตัวอย่างสำหรับทดสอบ", "national", false],
        ["12-05", "วันหยุดตัวอย่างสำหรับทดสอบ", "national", false],
        ["12-10", "วันหยุดตัวอย่างสำหรับทดสอบ", "national", false],
        ["12-28", "วันหยุดชดเชยตัวอย่าง", "compensatory", false],
        ["12-30", "วันหยุดครึ่งวันตัวอย่าง", "special", true],
        ["12-31", "วันสิ้นปี (ข้อมูลทดสอบ)", "national", false],
      ]) {
        await ensure(Holiday, { date: `${holidayYear}-${monthDay}` }, {
          name, year: holidayYear, type, isHalfDay, description: "ชุดข้อมูลสาธิต ไม่ใช่ประกาศวันหยุดอย่างเป็นทางการ",
        });
      }
    }
    const holidayNames = { "01-01": "วันขึ้นปีใหม่", "04-13": "วันสงกรานต์", "04-14": "วันสงกรานต์", "04-15": "วันสงกรานต์", "05-01": "วันหยุดประจำหน่วยงาน", "07-28": "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว", "08-12": "วันแม่แห่งชาติ", "10-23": "วันปิยมหาราช", "12-05": "วันพ่อแห่งชาติ", "12-10": "วันรัฐธรรมนูญ", "12-28": "วันหยุดชดเชยตามประกาศหน่วยงาน", "12-30": "วันหยุดครึ่งวันก่อนเทศกาลปีใหม่", "12-31": "วันสิ้นปี" };
    for (const holiday of await Holiday.findAll(options)) {
      if (holiday.description === "ชุดข้อมูลสาธิต ไม่ใช่ประกาศวันหยุดอย่างเป็นทางการ" && /ทดสอบ|ตัวอย่าง/.test(holiday.name)) {
        await holiday.update({ name: holidayNames[holiday.date.slice(5)] || holiday.name }, options);
      }
    }
    // Use all stored holidays so fixture day counts agree with this database.
    for (const holiday of await Holiday.findAll(options)) holidayKeys.add(holiday.date);
    const workday = (date) => ![0, 6].includes(date.getUTCDay()) && !holidayKeys.has(key(date));
    const nextWorkday = (date) => { let result = date; while (!workday(result)) result = shift(result, 1); return result; };
    const users = [];
    const firstNames = ["กิตติพงศ์", "ปิยวรรณ", "ณัฐวุฒิ", "สุภาวดี", "อรทัย", "ธนกฤต", "ศิริพร", "วรพล", "จิราภรณ์", "พงศกร", "มนัสวี", "สุรศักดิ์", "ชลธิชา", "ภาคิน", "รัตนาภรณ์", "อาทิตย์", "พรทิพย์", "ชยพล", "กมลวรรณ", "ธีรภัทร"];
    const lastNames = ["วัฒนกุล", "ศรีประเสริฐ", "บุญรักษา", "แก้วรุ่งเรือง", "สุขสวัสดิ์", "ปัญญาวัฒน์", "อินทรสุวรรณ"];
    const createUser = async (alias, role, departmentId, supervisorId, index = 0) => {
      const user = await ensure(User, { email: `${alias}@demo.test` }, {
        employeeId: `DEMO-${alias.toUpperCase()}`, password: PASSWORD, firstName: role === "employee" ? ["กานต์", "ปิยะ", "ณัฐ", "อรทัย", "สุภา", "ธนา"][index % 6] : { admin: "ผู้ดูแล", vp: "รองอธิการบดี", dean: "คณบดี", head: "หัวหน้างาน" }[role],
        lastName: `ทดสอบ ${alias}`, role, departmentId, supervisorId,
        personnelType: personnelTypes[index % personnelTypes.length], startDate: `${year - 8}-06-01`,
        position: role === "employee" ? "บุคลากรทดสอบ" : "ผู้อนุมัติทดสอบ", phone: "0800000000",
        governmentDivision: "มหาวิทยาลัยราชภัฏบุรีรัมย์", unit: "หน่วยงานทดสอบ", affiliation: "ข้อมูลสาธิต",
        signatureImage: "/uploads/demo/signature.png", profileImage: "/uploads/demo/avatar.png", isActive: true,
      });
      const staffIndex = users.length;
      if (user.lastName?.startsWith("ทดสอบ ")) {
        await user.update({
          firstName: firstNames[staffIndex % firstNames.length], lastName: lastNames[(Math.floor(staffIndex / firstNames.length) + staffIndex) % lastNames.length],
          position: role === "employee" ? (personnelTypes[index % personnelTypes.length].includes("academic") || personnelTypes[index % personnelTypes.length] === "contract_lecturer" ? "อาจารย์" : "เจ้าหน้าที่บริหารงานทั่วไป") : { admin: "เจ้าหน้าที่งานบริหารบุคคล", head: "หัวหน้าสาขาวิชา", dean: "คณบดี/ผู้อำนวยการ", vp: "รองอธิการบดีฝ่ายบริหาร" }[role],
          phone: "080000" + String(staffIndex + 1000).padStart(4, "0"), profileImage: null,
          unit: "มหาวิทยาลัยราชภัฏบุรีรัมย์", affiliation: "มหาวิทยาลัยราชภัฏบุรีรัมย์",
        }, options);
      }
      users.push(user);
      return user;
    };
    const departments = [];
    const groups = [];
    for (const [code, name, type, ...names] of faculties) {
      const faculty = await ensure(Faculty, { code }, { name, type, isActive: true });
      if (faculty.name === "สถาบันวิจัย (ทดสอบ)") await faculty.update({ name }, options);
      const group = { code, departments: [] };
      for (const [index, departmentName] of names.entries()) {
        const department = await ensure(Department, { code: `DEMO-${code}-${index + 1}` }, { name: `สาขา/ฝ่าย${departmentName} (ทดสอบ)`, facultyId: faculty.id, isActive: true });
        if (department.name.endsWith(" (ทดสอบ)")) await department.update({ name: type === "faculty" ? `สาขาวิชา${departmentName}` : departmentName }, options);
        departments.push(department); group.departments.push(department);
      }
      groups.push(group);
    }
    const admin = await createUser("admin", "admin", departments[0].id, null);
    const vp = await createUser("vp", "vp", departments[0].id, null);
    const employees = [];
    for (const [groupIndex, group] of groups.entries()) {
      const suffix = groupIndex === 0 ? "" : `-${groupIndex + 1}`;
      const dean = await createUser(`dean${suffix}`, "dean", group.departments[0].id, vp.id);
      const head = await createUser(`head${suffix}`, "head", group.departments[0].id, dean.id);
      for (const department of group.departments) {
        for (let i = 0; i < 2; i++) {
          const index = employees.length;
          const alias = index === 0 ? "employee" : `employee${String(index + 1).padStart(2, "0")}`;
          const user = await createUser(alias, "employee", department.id, head.id, index);
          employees.push({ user, head, dean });
        }
      }
    }
    // Include balances for the admin account created earlier, without changing it.
    const originalAdmin = await User.findOne({ where: { email: "admin@bru.ac.th" }, ...options });
    if (originalAdmin?.firstName === "Admin" && originalAdmin.lastName === "Test") {
      await originalAdmin.update({ firstName: "กฤตภาส", lastName: "ศรีวิจิตร", position: "เจ้าหน้าที่งานบริหารบุคคล", departmentId: groups.find(group => group.code === "ADMIN").departments[0].id }, options);
    }
    for (const user of [...users, ...(originalAdmin ? [originalAdmin] : [])]) {
      for (const balanceYear of [fiscalYear - 1, fiscalYear, fiscalYear + 1]) {
        for (const type of types) {
          await ensure(LeaveBalance, { userId: user.id, leaveTypeId: type.id, year: balanceYear }, {
            totalDays: type.defaultDays, usedDays: 0, carriedOverDays: type.code === "vacation" ? 5 : 0,
          });
        }
      }
    }
    let createdRequests = 0;
    const createRequest = async (employee, status, type, date, slot, tag, length = 2) => {
      const start = nextWorkday(date);
      let end = start;
      if (slot === "full") {
        let counted = 1;
        while (counted < length) { end = shift(end, 1); if (workday(end) || ["ordination", "military"].includes(type.code)) counted++; }
      }
      const createdAt = new Date(Math.min(shift(start, -7).getTime(), shift(reference, -6).getTime()));
      const stages = [];
      const defaults = {
        userId: employee.user.id, leaveTypeId: type.id, startDate: key(start), endDate: key(end), totalDays: slot === "full" ? length : 0.5,
        timeSlot: slot, status, contactAddress: "ที่อยู่สมมติสำหรับทดสอบระบบ", contactPhone: "0800000000", createdAt,
      };
      const legacyReason = `[DEMO:${tag}] ${type.name} เพื่อทดสอบสถานะ ${status}`;
      const reasons = { sick: "เข้ารับการตรวจรักษาและพักฟื้นตามคำแนะนำของแพทย์", personal: "ดำเนินธุระเกี่ยวกับเอกสารของครอบครัว", vacation: "พักผ่อนประจำปีและเดินทางเยี่ยมครอบครัว", maternity: "ลาคลอดบุตรตามกำหนดของแพทย์", paternity: "ดูแลภริยาและบุตรหลังคลอด", childcare: "ดูแลบุตรและพาไปตรวจสุขภาพตามนัด", ordination: "เข้ารับการอุปสมบทตามกำหนดของครอบครัว", military: "เข้ารับการตรวจเลือกตามหมายเรียก" };
      const reason = `${reasons[type.code]} กำหนดวันที่ ${start.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })}`;
      defaults.reason = reason;
      defaults.contactAddress = "ที่พักอาศัย ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์";
      defaults.contactPhone = employee.user.phone;
      let currentStatus = "pending";
      const stage = (action, actor, newStatus, day, note) => {
        const at = shift(createdAt, day);
        stages.push({ action, actionBy: actor.id, oldStatus: currentStatus, newStatus, note, createdAt: at });
        currentStatus = newStatus; return at;
      };
      if (["pending_dean", "pending_vp", "approved", "confirmed"].includes(status)) {
        defaults.headApprovedBy = employee.head.id;
        defaults.headComment = "เห็นชอบ เนื่องจากได้จัดผู้ปฏิบัติงานแทนเรียบร้อยแล้ว";
        defaults.headApprovedAt = stage("approved", employee.head, "pending_dean", 1, defaults.headComment);
      }
      if (["pending_vp", "approved", "confirmed"].includes(status)) {
        defaults.deanApprovedBy = employee.dean.id;
        defaults.deanComment = "เห็นชอบ เนื่องจากได้จัดผู้ปฏิบัติงานแทนเรียบร้อยแล้ว";
        defaults.deanApprovedAt = stage("approved", employee.dean, "pending_vp", 2, defaults.deanComment);
      }
      if (["approved", "confirmed"].includes(status)) {
        defaults.vpApprovedBy = vp.id; defaults.vpDecision = "allow"; defaults.vpComment = "อนุญาตตามสิทธิ์และระเบียบการลา";
        defaults.vpApprovedAt = stage("approved", vp, "approved", 3, defaults.vpComment);
        defaults.approvedBy = vp.id; defaults.approvedAt = defaults.vpApprovedAt;
      }
      if (status === "confirmed") {
        defaults.confirmedBy = admin.id; defaults.confirmedNote = "ตรวจสอบเอกสารครบถ้วนและบันทึกวันลาเรียบร้อย";
        defaults.confirmedAt = stage("confirmed", admin, "confirmed", 4, defaults.confirmedNote);
      } else if (status === "rejected") {
        defaults.rejectionReason = "มีภารกิจบริการนักศึกษาตามกำหนด ขอให้ปรับช่วงวันลาและยื่นใหม่";
        stage("rejected", employee.head, status, 1, defaults.rejectionReason);
      } else if (status === "cancelled") {
        defaults.cancelReason = "ยกเลิกเนื่องจากเลื่อนกำหนดนัดหมาย ขอปฏิบัติงานตามปกติ";
        defaults.cancelledAt = stage("cancelled", employee.user, status, 1, defaults.cancelReason);
      }
      const [request, created] = await LeaveRequest.findOrCreate({ where: { userId: employee.user.id, [Op.or]: [{ reason: legacyReason }, { reason, startDate: key(start) }] }, defaults, ...options });
      if (!created) {
        if (request.reason === legacyReason) {
          await request.update({ reason, contactAddress: defaults.contactAddress, contactPhone: defaults.contactPhone,
            ...(request.headComment === "เห็นชอบ (ข้อมูลทดสอบ)" ? { headComment: defaults.headComment } : {}),
            ...(request.deanComment === "เห็นชอบ (ข้อมูลทดสอบ)" ? { deanComment: defaults.deanComment } : {}),
            ...(request.vpComment === "อนุญาต (ข้อมูลทดสอบ)" ? { vpComment: defaults.vpComment } : {}),
            ...(request.confirmedNote === "ยืนยันและหักสิทธิ์แล้ว (ข้อมูลทดสอบ)" ? { confirmedNote: defaults.confirmedNote } : {}),
            ...(request.rejectionReason === "ไม่อนุญาตเนื่องจากติดภารกิจ (ข้อมูลทดสอบ)" ? { rejectionReason: defaults.rejectionReason } : {}),
            ...(request.cancelReason === "เปลี่ยนกำหนดการ (ข้อมูลทดสอบ)" ? { cancelReason: defaults.cancelReason } : {}),
          }, options);
          await LeaveHistory.update({ note: reason }, { where: { leaveRequestId: request.id, note: legacyReason }, ...options });
          await Notification.update({ title: `คำขอ${type.name}`, message: `${employee.user.firstName} ${employee.user.lastName}: ${reason}` }, { where: { relatedLeaveId: request.id, message: legacyReason }, ...options });
        }
        return;
      }
      createdRequests++;
      await LeaveHistory.create({ leaveRequestId: request.id, action: "created", actionBy: employee.user.id, newStatus: "pending", note: reason, createdAt }, options);
      for (const entry of stages) await LeaveHistory.create({ leaveRequestId: request.id, ...entry }, options);
      if (status === "confirmed") {
        await LeaveBalance.increment("usedDays", { by: Number(request.totalDays), where: { userId: employee.user.id, leaveTypeId: type.id, year: getFiscalYear(start) }, ...options });
      }
      if (type.code === "sick" || tag.startsWith("monthly")) {
        await LeaveAttachment.create({ leaveRequestId: request.id, fileName: "supporting-document.pdf", originalName: "เอกสารประกอบตัวอย่าง.pdf", filePath: "/uploads/demo/supporting-document.pdf", fileType: "application/pdf", fileSize }, options);
      }
      const recipient = { pending: employee.head, pending_dean: employee.dean, pending_vp: vp, approved: admin }[status] || employee.user;
      const notificationType = { approved: "approval", confirmed: "confirmation", rejected: "rejection", cancelled: "cancellation" }[status] || "leave_request";
      await Notification.create({ userId: recipient.id, relatedLeaveId: request.id, type: notificationType, title: `คำขอ${type.name}`, message: `${employee.user.firstName} ${employee.user.lastName}: ${reason}`, isRead: ["confirmed", "cancelled"].includes(status), readAt: ["confirmed", "cancelled"].includes(status) ? reference : null, createdAt }, options);
    };
    for (const [employeeIndex, employee] of employees.entries()) {
      for (const [statusIndex, status] of statuses.entries()) {
        const type = types[(employeeIndex + statusIndex) % types.length];
        const date = shift(reference, [7, 14, 21, 28, -7, -30, -45][statusIndex] + employeeIndex % 3);
        await createRequest(employee, status, type, date, ["full", "morning", "afternoon"][(employeeIndex + statusIndex) % 3], `${employeeIndex}-${status}`);
      }
    }
    // Past monthly requests give reports and fiscal-year filters visible trends.
    for (let offset = 0; offset < 18; offset++) {
      const date = new Date(Date.UTC(year, reference.getUTCMonth() - offset, 9, 12));
      await createRequest(employees[offset % employees.length], offset % 3 ? "confirmed" : "approved", types[offset % types.length], date, "full", `monthly-${offset}`);
    }
    // Long leave plus a cross-year period for calendar and date-range testing.
    await createRequest(employees[0], "approved", types[3], new Date(Date.UTC(year, 11, 1, 12)), "full", "long-maternity", 20);
    await createRequest(employees[1], "approved", types[6], new Date(Date.UTC(year, 11, 29, 12)), "full", "cross-year", 7);
    return { demoUsers: users.length, departments: departments.length, faculties: faculties.length, createdRequests, passwords: "Demo123!", fiscalYears: [fiscalYear - 1, fiscalYear, fiscalYear + 1] };
  });
  console.log(JSON.stringify(summary, null, 2));
}

seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
