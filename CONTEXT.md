# Domain Glossary & Context — BRU LMS

## 1. Domain Entities & Concepts

### Leave Request (คำขอลา / ใบลา)
- **LeaveRequest**: เอกสารคำขอลาทางอิเล็กทรอนิกส์ บันทึกประเภทการลา ช่วงเวลา เหตุผล ผู้ขอลา และสถานะปัจจุบัน
- **Leave Status Lifecycle**:
  - `pending` (รอพิจารณา): ยื่นคำขอแล้ว รอหัวหน้างานพิจารณา
  - `approved` (อนุมัติแล้ว): หัวหน้างานอนุมัติแล้ว รอเจ้าหน้าที่ HR/Admin ยืนยันข้อมูล
  - `rejected` (ไม่อนุมัติ): หัวหน้างานหรือ HR ไม่อนุมัติคำขอ
  - `confirmed` (ยืนยัน/ตัดยอดแล้ว): HR บันทึกเข้าระบบราชการและตัดยอดวันลาคงเหลือแล้ว
  - `cancelled` (ยกเลิก): ผู้ขอยกเลิกคำขอ (หากเคย confirmed มาก่อน ระบบจะคืนยอดวันลา)

### Leave Balance (ยอดวันลาคงเหลือ)
- **LeaveBalance**: สิทธิและจำนวนวันลาคงเหลือของบุคลากรรายบุคคล แยกตามประเภทการลาและปีงบประมาณ
- **Fiscal Year (ปีงบประมาณ)**: 1 ตุลาคม ของปีปัจจุบัน ถึง 30 กันยายน ของปีถัดไป (เช่น วันที่ 15 ต.ค. 2024 อยู่ในปีงบประมาณ 2025)
- **Carried Over Days (วันลายกยอดสะสม)**: วันลาพักผ่อนที่สะสมข้ามปีงบประมาณตามเกณฑ์อายุราชการ (อายุงาน $\ge$ 10 ปี สะสมได้สูงสุด 20 วัน, $< 10$ ปี สูงสุด 10 วัน)

### Audit & History
- **LeaveHistory**: บันทึกเส้นทางการดำเนินการ (Audit Trail) ทุกครั้งที่มีการเปลี่ยนสถานะหรือแก้ไขคำขอ พร้อมระบุผู้กระทำ (`actionBy`) และเหตุผล/หมายเหตุ

---

## 2. Deep Modules & Seams

### Leave Lifecycle Module (`LeaveLifecycle`)
- **Role**: จัดการวงจรชีวิตของใบลาทั้งหมด (Submission, Approval, Rejection, Confirmation, Cancellation, Modification)
- **Seam Interface**:
  - `create(payload, actor, files)`
  - `transition(requestId, action, actor, options)`
- **Encapsulated Invariants**:
  - การล็อก Record (`SELECT ... FOR UPDATE`) ป้องกัน Concurrency Race Conditions
  - การตรวจสอบกฎระเบียบวันลา (Medical certificate, working days, balance availability)
  - การตัดยอด/คืนยอดวันลา (`LeaveBalance`) อัตโนมัติและสอดคล้องกับสถานะ
  - การบันทึก `LeaveHistory` ภายใน Transaction เดียวกัน
  - การส่ง Notification/Email/Webhook/SSE นอก Transaction อย่างปลอดภัย

### User Ingestion Module (`UserIngestion`)
- **Role**: จัดการการนำเข้าข้อมูลบุคลากรแบบกลุ่ม (Batch Ingestion) และการซิงค์ข้อมูลจากระบบภายนอก (CSV/Excel, Remote SQL Database, University REST API)
- **Seam Interface**:
  - `previewFile({ filePath, originalName })`
  - `importFile({ filePath, originalName })`
  - `previewDbSync({ query, config })`
  - `executeDbSync({ query, mapping, config })`
  - `previewApiSync({ url, headers })`
  - `executeApiSync({ url, headers, mapping })`
  - `generateImportTemplate(res)`
- **Encapsulated Invariants**:
  - การป้องกัน Server-Side Request Forgery (`isSSRFSafeUrl`) กรอง Local/Private IP addresses
  - การป้องกัน SQL Injection & File Exploits (`isReadOnlySelectQuery`) กรองคำสั่งแก้ไขข้อมูลและคำสั่งโหลด/เขียนไฟล์
  - การแปลงข้อมูลและการจับคู่คอลัมน์ (Schema Normalization & Smart Department/Supervisor Resolution)
  - การสร้างรหัสพนักงานอัตโนมัติ (`employeeId`) และการสร้างสิทธิวันลาตั้งต้น (`LeaveBalance`)

### Report Export Module (`ReportExportService`)
- **Role**: จัดการการสร้างเอกสารและรายงานสถิติการลาแบบหลายรูปแบบ (Multi-Format Document Generation: Excel & PDF)
- **Seam Interface**:
  - `exportExcel({ leaveRequests, queryParams, meta, res })`
  - `exportPDF({ userGroups, queryParams, actor, res })`
- **Encapsulated Invariants**:
  - การจัดหมวดหมู่วันลาตามแบบมาตรฐาน ก.พ./มรภ.บุรีรัมย์ (`categorizeLeaveDays`)
  - ตัวแปลงวันที่และปีงบประมาณภาษาไทย (`formatThaiShortDate`, `formatPeriodLabel`)
  - การคำนวณพิกัดตาราง (Coordinate math), การตัดหน้าขึ้นหน้าใหม่ (Max 15 rows/page) พร้อม Running Header และ Running Summary
  - การโหลดและจัดการ Fallback Thai Font (`THSarabun.ttf` / `Mitr-Regular.ttf`) และตราสัญลักษณ์มหาวิทยาลัย
  - การประทับตรา Footer ท้ายกระดาษ (`OPR-HR-034`, รหัสผู้พิมพ์, วันที่พิมพ์, เลขหน้า `หน้า X / Y`)

### Real-Time Event Stream Engine (`SSEService`)
- **Role**: จัดการการส่งข้อมูลแบบ Real-time (Unidirectional Server-Sent Events) ไปยัง Browser Client
- **Seam Interface**:
  - `addClient(userId, res, req)`
  - `sendToUser(userId, event, data)`
  - `sendToUsers(userIds, event, data)`
  - `broadcast(event, data)`
- **Encapsulated Invariants**:
  - การจัดการ Connection Registry (`Map<userId, Set<res>>`) รองรับ Multi-tabs/devices
  - การส่ง Heartbeat Ping (`:keep-alive\n\n`) ทุก 25 วินาที ป้องกัน Proxy/Nginx Timeout
  - การตัดการเชื่อมต่อและทำความสะอาด Memory ทันทีที่ Client ปิด Browser (`close` event)
  - รองรับการ Authenticate ผ่าน Header และ Query Token สำหรับ Web Browser `EventSource`

### Client Collection Query Engine (`useCollectionQuery`)
- **Role**: Hook จัดการค้นหา กรองข้อมูลหลายมิติ จัดเรียง แบ่งหน้า และคำนวณสถิติอัตโนมัติบนฝั่ง Client
- **Seam Interface**:
  - `useCollectionQuery(items, { searchFields, initialFilters, filterExtractors, initialSort, pageSize, statsConfig })`
- **Encapsulated Invariants**:
  - การค้นหาแบบ Multi-Field พร้อม Deep Nested Path Resolution (`user.department.name`)
  - การกรองแบบ Multi-facet (Role, Faculty, Department, Status) และ Reset หน้าอัตโนมัติ
  - การคำนวณ Dynamic Statistics Cards (`stats.pending`, `stats.confirmed`, `stats.total`) จาก Dataset โดยตรง
  - การจัดเรียงภาษาไทยและตัวเลข (`localeCompare('th-TH', { numeric: true })`)
