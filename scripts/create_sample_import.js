const fs = require('fs');
const path = require('path');
const ExcelJS = require('../server/node_modules/exceljs');

async function createSampleFiles() {
  const dir = path.join(__dirname, '..', 'sample_data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const publicDir = path.join(__dirname, '..', 'client', 'public', 'sample_data');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const headers = [
    { header: 'employeeId(รหัสบุคลากร)', key: 'employeeId', width: 22 },
    { header: 'firstName(ชื่อ)', key: 'firstName', width: 20 },
    { header: 'lastName(นามสกุล)', key: 'lastName', width: 20 },
    { header: 'email(อีเมล)', key: 'email', width: 30 },
    { header: 'password(รหัสผ่าน เว้นว่างได้)', key: 'password', width: 20 },
    { header: 'position(ตำแหน่ง)', key: 'position', width: 35 },
    { header: 'personnelType(ประเภทบุคลากร)', key: 'personnelType', width: 38 },
    { header: 'role(บทบาท)', key: 'role', width: 25 },
    { header: 'facultyId(คณะ)', key: 'facultyId', width: 25 },
    { header: 'departmentId(สาขาวิชา/หน่วยงาน)', key: 'departmentId', width: 32 },
    { header: 'supervisorId(หัวหน้างาน)', key: 'supervisorId', width: 25 },
    { header: 'phone(เบอร์โทรศัพท์)', key: 'phone', width: 18 },
    { header: 'startDate(วันที่เริ่มงาน)', key: 'startDate', width: 20 },
  ];

  const rows = [
    {
      employeeId: '2567001',
      firstName: 'กิตติภูมิ',
      lastName: 'ทรงศักดิ์',
      email: 'kittiphum.t@bru.ac.th',
      password: 'Password123!',
      position: 'อาจารย์ประจำสาขาวิชาวิทยาการคอมพิวเตอร์',
      personnelType: 'พนักงานมหาวิทยาลัยสายผู้สอน',
      role: 'บุคลากร',
      facultyId: 'คณะวิทยาศาสตร์',
      departmentId: 'สาขาวิชาวิทยาการคอมพิวเตอร์',
      supervisorId: 'วิทวัส สุวรรณโชติ',
      phone: '0812345678',
      startDate: '2022-06-01',
    },
    {
      employeeId: '2567002',
      firstName: 'พัชราภรณ์',
      lastName: 'สุขประเสริฐ',
      email: 'patcharaporn.s@bru.ac.th',
      password: 'Password123!',
      position: 'นักวิชาการคอมพิวเตอร์ปฏิบัติการ',
      personnelType: 'พนักงานมหาวิทยาลัยสายสนับสนุน',
      role: 'บุคลากร',
      facultyId: 'คณะวิทยาศาสตร์',
      departmentId: 'สาขาวิชาเทคโนโลยีสารสนเทศ',
      supervisorId: 'วิทวัส สุวรรณโชติ',
      phone: '0823456789',
      startDate: '2023-01-15',
    },
    {
      employeeId: '2567003',
      firstName: 'ธีรเดช',
      lastName: 'รัตนพงษ์',
      email: 'theeradech.r@bru.ac.th',
      password: 'Password123!',
      position: 'ผู้ช่วยศาสตราจารย์ประจำสาขาวิชาคณิตศาสตร์',
      personnelType: 'ข้าราชการในสถาบันอุดมศึกษา (สายผู้สอน)',
      role: 'บุคลากร',
      facultyId: 'คณะวิทยาศาสตร์',
      departmentId: 'สาขาวิชาคณิตศาสตร์',
      supervisorId: 'วิทวัส สุวรรณโชติ',
      phone: '0834567890',
      startDate: '2018-08-01',
    },
    {
      employeeId: '2567004',
      firstName: 'จินตนา',
      lastName: 'มงคลกุล',
      email: 'jintana.m@bru.ac.th',
      password: 'Password123!',
      position: 'เจ้าหน้าที่บริหารงานทั่วไปปฏิบัติการ',
      personnelType: 'ข้าราชการในสถาบันอุดมศึกษา (สายสนับสนุน)',
      role: 'บุคลากร',
      facultyId: 'สำนักงานอธิการบดี',
      departmentId: 'สำนักงานอธิการบดี',
      supervisorId: 'สุพจน์ เมธาพรหม',
      phone: '0845678901',
      startDate: '2019-10-01',
    },
    {
      employeeId: '2567005',
      firstName: 'อัครพล',
      lastName: 'พิชัยยุทธ',
      email: 'akarapon.p@bru.ac.th',
      password: 'Password123!',
      position: 'อาจารย์ประจำสาขาวิชาการบัญชี',
      personnelType: 'อาจารย์อัตราจ้าง',
      role: 'บุคลากร',
      facultyId: 'คณะวิทยาการจัดการ',
      departmentId: 'สาขาวิชาการบัญชี',
      supervisorId: 'สมชาย วงศ์สวัสดิ์',
      phone: '0856789012',
      startDate: '2024-05-16',
    },
  ];

  // 1. Create Excel (.xlsx)
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Template');
  sheet.columns = headers;

  // Header styling
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // Blue
  };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 28;

  rows.forEach((row, idx) => {
    const r = sheet.addRow(row);
    r.height = 22;
    r.alignment = { vertical: 'middle' };
    if (idx % 2 === 1) {
      r.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' },
      };
    }
  });

  const xlsxPath = path.join(dir, 'ตัวอย่างไฟล์นำเข้าบุคลากร_5คน.xlsx');
  await workbook.xlsx.writeFile(xlsxPath);
  await workbook.xlsx.writeFile(path.join(publicDir, 'ตัวอย่างไฟล์นำเข้าบุคลากร_5คน.xlsx'));
  console.log('Saved XLSX to:', xlsxPath);

  // 2. Create CSV (.csv) with UTF-8 BOM
  const csvHeaders = headers.map((h) => h.header).join(',');
  const csvLines = rows.map((r) =>
    [
      r.employeeId,
      r.firstName,
      r.lastName,
      r.email,
      r.password,
      `"${r.position}"`,
      `"${r.personnelType}"`,
      r.role,
      r.facultyId,
      r.departmentId,
      r.supervisorId,
      r.phone,
      r.startDate,
    ].join(',')
  );

  const csvContent = '\uFEFF' + [csvHeaders, ...csvLines].join('\r\n');
  const csvPath = path.join(dir, 'ตัวอย่างไฟล์นำเข้าบุคลากร_5คน.csv');
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  fs.writeFileSync(path.join(publicDir, 'ตัวอย่างไฟล์นำเข้าบุคลากร_5คน.csv'), csvContent, 'utf8');
  console.log('Saved CSV to:', csvPath);
}

createSampleFiles()
  .then(() => console.log('Successfully generated sample files'))
  .catch(console.error);
