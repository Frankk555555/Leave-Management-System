# Domain Glossary & Context — BRU LMS

## 1. Domain Entities & Concepts

### ลำดับขั้นบทบาทผู้ใช้งาน (User Role Hierarchy)

ระบบแบ่งบทบาทตามสายการบังคับบัญชาจริงในมหาวิทยาลัยราชภัฏบุรีรัมย์ 5 ระดับ:

| บทบาท (Role) | ระดับ | ความรับผิดชอบ |
|---|---|---|
| `employee` | บุคลากรทั่วไป | ยื่นคำขอลา ตรวจสอบสถานะ จัดการข้อมูลส่วนตัว |
| `head` | หัวหน้างาน / หัวหน้าภาค / หัวหน้าสาขาวิชา | อนุมัติ Tier 1 (ขั้น `pending` → `pending_dean`) |
| `dean` | คณบดี / ผู้อำนวยการสำนัก / ผู้อำนวยการสถาบัน | อนุมัติ Tier 2 (ขั้น `pending_dean` → `pending_vp`) |
| `vp` | รองอธิการบดีฝ่ายบริหารงานบุคคลและเทคโนโลยีสารสนเทศ | มีคำสั่ง Tier 3 (ขั้น `pending_vp` → `approved` หรือ `rejected`) |
| `admin` | ผู้ดูแลระบบ / เจ้าหน้าที่กองบริหารงานบุคคล (HR) | ยืนยันการลา ตัดยอดวันลา บริหารจัดการบุคลากรและระบบ |

**กฎพิเศษ — Skip-Tier Submission:** เมื่อบุคลากรระดับบริหารยื่นคำขอด้วยตนเอง ระบบจะสร้างคำขอด้วยสถานะเริ่มต้นที่สูงกว่า `pending`:
- บุคลากร Role `head` → สร้างสถานะ `pending_dean` (ข้าม Tier 1)
- บุคลากร Role `dean` → สร้างสถานะ `pending_vp` (ข้าม Tier 1 & 2)
- บุคลากร Role `vp` → สร้างสถานะ `approved` (ข้ามทุก Tier)

### ประเภทบุคลากร (Personnel Categories)

ระบบรองรับบุคลากร 5 หมวดตามระเบียบมหาวิทยาลัยราชภัฏบุรีรัมย์ (ขอบเขตโครงการ 1.4.2):

| รหัส (`personnelType`) | ประเภท |
|---|---|
| `civil_servant_academic` | ข้าราชการในสถาบันอุดมศึกษา (สายผู้สอน) |
| `civil_servant_support` | ข้าราชการในสถาบันอุดมศึกษา (สายสนับสนุน) |
| `university_employee_academic` | พนักงานมหาวิทยาลัยสายผู้สอน *(Default)* |
| `university_employee_support` | พนักงานมหาวิทยาลัยสายสนับสนุน |
| `contract_lecturer` | อาจารย์อัตราจ้าง |
| `temporary_employee` | ลูกจ้างชั่วคราวมหาวิทยาลัย |

### Leave Request (คำขอลา / ใบลา)
- **LeaveRequest**: เอกสารคำขอลาทางอิเล็กทรอนิกส์ บันทึกประเภทการลา (`leaveTypeId` FK → `leave_types`), ช่วงเวลา (`startDate`, `endDate`), ช่วงวัน (`timeSlot`: `full` / `morning` / `afternoon`), จำนวนวัน (`totalDays` DECIMAL รองรับ 0.5), เหตุผล (`reason`), สถานที่ติดต่อ (`contactAddress`, `contactPhone`), ผู้ขอลา (`userId`) และสถานะปัจจุบัน
- **Leave Status Lifecycle** (7 สถานะ):
  - `pending` (รอหัวหน้างาน): ยื่นคำขอแล้ว รอ Head พิจารณา
  - `pending_dean` (รอคณบดี): Head ให้ความเห็นชอบ (`headComment`, `headApprovedBy`) ส่งต่อคณบดี
  - `pending_vp` (รอรองอธิการบดีฯ): คณบดี/ผอ.สำนักให้ความเห็นชอบ (`deanComment`, `deanApprovedBy`) ส่งต่อรองอธิการบดีฯ
  - `approved` (อนุมัติ): รองอธิการบดีฯ มีคำสั่งอนุญาต (`vpDecision: "allow"`, `vpApprovedBy`) รอ Admin ยืนยัน
  - `rejected` (ไม่อนุมัติ): ถูกปฏิเสธโดย Head / Dean / VP พร้อม `rejectionReason`
  - `confirmed` (ยืนยัน/ตัดยอด): Admin ยืนยัน (`confirmedBy`, `confirmedAt`) และหัก `usedDays` ใน `LeaveBalance`
  - `cancelled` (ยกเลิก): ผู้ขอหรือ Admin ยกเลิก; หากเคย `confirmed` ระบบจะ **คืนยอดวันลา** โดยอัตโนมัติ (`LeaveBalance.decrement("usedDays")`)

### Leave Balance (ยอดวันลาคงเหลือ)
- **LeaveBalance**: สิทธิวันลาคงเหลือของบุคลากรรายบุคคล แยกตามประเภทการลา (`leaveTypeId` FK) และปีงบประมาณ (`year`). ฟิลด์หลัก: `allocatedDays` (สิทธิ์ที่ได้รับ), `usedDays` (วันที่ใช้ไป), `carriedOverDays` (วันยกยอด)
- **Fiscal Year (ปีงบประมาณ)**: 1 ตุลาคม ของปีปัจจุบัน ถึง 30 กันยายน ของปีถัดไป (เช่น วันที่ 15 ต.ค. 2024 อยู่ในปีงบประมาณ 2025). ฟังก์ชัน `getFiscalYear(date)` ใน `leaveValidationService.js`
- **Carried Over Days (วันลายกยอดสะสม)**: วันลาพักผ่อนที่สะสมข้ามปีงบประมาณตามเกณฑ์อายุราชการ (อายุงาน $\ge$ 10 ปี สะสมได้สูงสุด 20 วัน, $< 10$ ปี สูงสุด 10 วัน). **Cron Job** ทำงานทุก 1 ตุลาคม อัตโนมัติ (`fiscalYearJob.js`)

### Audit & History
- **LeaveHistory**: บันทึก Audit Trail ทุกครั้งที่มีการเปลี่ยนสถานะหรือแก้ไขคำขอ ฟิลด์: `action` (`created` / `approved` / `rejected` / `confirmed` / `cancelled` / `edited`), `actionBy` (FK User), `oldStatus`, `newStatus`, `note`; บันทึกภายใน Transaction เดียวกับการเปลี่ยนสถานะ

### Calendar & Planning
- **ปฏิทินวันลาส่วนบุคคล (Personal Leave Calendar)**: มุมมองสำหรับบุคลากรใช้ดูวันหยุดราชการและคำขอลาของตนที่ยังมีผล ได้แก่ รอพิจารณา อนุมัติแล้ว และยืนยันแล้ว เพื่อช่วยวางแผนการลา
  _หลีกเลี่ยง_: ปฏิทินทีม, ปฏิทินอนุมัติ
- **ช่วงคำขอลา (Requested Leave Span)**: ช่วงตั้งแต่วันเริ่มต้นถึงวันสิ้นสุดตามคำขอ ซึ่งอาจครอบคลุมวันหยุด; วันทำการที่ลาต้องแสดงเด่นกว่าวันหยุดภายในช่วงเดียวกัน
  _หลีกเลี่ยง_: จำนวนวันลาที่ถูกตัดยอด

### Holiday
- **Holiday**: วันหยุดราชการ (`national`), วันหยุดพิเศษ (`special`), หรือวันชดเชย (`compensatory`). รองรับวันหยุดครึ่งวัน (`isHalfDay`). ใช้ในการนับวันทำการเพื่อคำนวณ `totalDays` และตรวจสอบสิทธิ์วันลาซ้อน

### Notification
- **Notification**: การแจ้งเตือน In-App ผ่าน SSE stream และ In-App Bell. ฟิลด์: `userId`, `relatedLeaveId` (FK LeaveRequest), `message`, `isRead`. ส่งผ่าน `SSEService.sendToUser()` หลัง commit transaction และบันทึกลง DB พร้อมกัน

---

## 2. Deep Modules & Seams

### Leave Lifecycle Module (`LeaveLifecycle`)
- **File**: `server/services/leaveLifecycleService.js` (~1,248 lines)
- **Role**: จัดการวงจรชีวิตของใบลาทั้งหมด (Submission, Approval, Rejection, Confirmation, Cancellation, Edit)
- **Seam Interface**:
  - `create(payload, actor, files)` — ตรวจสอบ validation, สร้าง LeaveRequest + LeaveHistory + LeaveAttachment ใน transaction เดียว, แล้ว dispatch Notification/Email/n8n นอก transaction
  - `transition(requestId, action, actor, options)` — ส่งต่อให้ `_handleApprove`, `_handleReject`, `_handleConfirm`, `_handleCancel`, หรือ `_handleEdit` ตาม action
- **Encapsulated Invariants**:
  - การล็อก Record (`SELECT ... FOR UPDATE`) ป้องกัน Concurrency Race Conditions
  - Multi-tier approve: `pending` → (head/admin) → `pending_dean` → (dean/admin) → `pending_vp` → (vp/admin) → `approved`
  - VP สามารถ `disallow` เพื่อ reject จาก `pending_vp` ได้โดยตรง
  - Reject ได้ทุก Tier ตามบทบาท (head ที่ `pending`, dean ที่ `pending_dean`, vp ที่ `pending_vp`)
  - Authorization: ตรวจสอบ department isolation (head ต้องอยู่ department เดียวกับผู้ขอ), ป้องกันการอนุมัติใบลาของตนเอง
  - Balance deduction ด้วย `LeaveBalance.increment("usedDays")` ใน `_handleConfirm`
  - Balance restoration ด้วย `LeaveBalance.decrement("usedDays")` ใน `_handleCancel` หากเดิมเป็น `confirmed`
  - บันทึก `LeaveHistory` ภายใน Transaction เดียวกันเสมอ
  - dispatch Notification/Email/SSE/n8n หลัง `await t.commit()` เท่านั้น (ไม่ทำใน transaction)

### Leave Validation Service (`leaveValidationService`)
- **File**: `server/services/leaveValidationService.js`
- **Role**: ตรวจสอบกฎระเบียบการลาก่อนสร้างคำขอ (หรือ edit)
- **Seam Interface**:
  - `validateLeaveRequest(payload, transaction)` — ตรวจสอบและคืน `{ valid, message, totalDays, workingDays, countWorkingDaysOnly }`
  - `getFiscalYear(date?)` — คืนปีงบประมาณ (Gregorian) ของวันที่กำหนด หรือ วันปัจจุบัน
  - `countWorkingDays(startDate, endDate, holidays)` — นับวันทำการ (หักเสาร์-อาทิตย์ และวันหยุดราชการ)
- **Encapsulated Invariants**:
  - ตรวจสอบ Balance เหลือพอก่อนอนุมัติ (รวม `pending`/`pending_dean`/`pending_vp` ที่ยังอยู่ในระบบ)
  - ตรวจสอบใบรับรองแพทย์ (`hasMedicalCertificate`) สำหรับลาป่วยติดต่อกัน ≥ 3 วันทำการ
  - ตรวจสอบ `childBirthDate`, `ceremonyDate` สำหรับประเภทลาพิเศษ (Maternity, Paternity, Ordination)

### User Ingestion Module (`UserIngestion`)
- **File**: `server/services/userIngestionService.js` (~51,164 bytes)
- **Role**: จัดการการนำเข้าข้อมูลบุคลากรแบบกลุ่ม (Batch Ingestion) และการซิงค์ข้อมูลจากระบบภายนอก (CSV/Excel, Remote SQL Database, University REST API)
- **Seam Interface**:
  - `previewFile({ filePath, originalName })` — อ่านและแสดงตัวอย่างข้อมูลจากไฟล์ CSV/Excel ก่อน import จริง
  - `importFile({ filePath, originalName })` — นำเข้าข้อมูลจริงพร้อม upsert และสร้าง LeaveBalance เริ่มต้น
  - `previewDbSync({ query, config })` — ทดสอบเชื่อมต่อฐานข้อมูลภายนอกและแสดงตัวอย่างคอลัมน์
  - `executeDbSync({ query, mapping, config })` — ซิงค์ข้อมูลจากฐานข้อมูลภายนอก
  - `previewApiSync({ url, headers })` — ดึงข้อมูลตัวอย่างจาก University API
  - `executeApiSync({ url, headers, mapping })` — ซิงค์ข้อมูลจาก University API
  - `generateImportTemplate(res)` — สร้างและดาวน์โหลดไฟล์ Excel template พร้อม dropdown validation
  - `getMockUniversityApi()` / `setupMockDb()` — ข้อมูลจำลองสำหรับทดสอบ
- **Encapsulated Invariants**:
  - การป้องกัน Server-Side Request Forgery (`isSSRFSafeUrl`) — กรอง Private/Loopback IP และ DNS Rebinding
  - การป้องกัน SQL Injection (`isReadOnlySelectQuery`) — อนุญาตเฉพาะ `SELECT` statement เท่านั้น, บล็อก DDL/DML/LOAD FILE/INTO OUTFILE
  - การแปลง Schema และ Smart Resolution (Department name → ID, Supervisor email → User ID)
  - การสร้าง `employeeId` อัตโนมัติ และสร้าง `LeaveBalance` เริ่มต้นสำหรับทุกประเภทการลาที่ active
  - Magic Bytes file signature validation ผ่าน `validateFileSignature.js` (ก่อนส่งไฟล์ไปประมวลผล)

### Report Export Module (`ReportExportService`)
- **File**: `server/services/reportExportService.js`
- **Role**: จัดการการสร้างเอกสารและรายงานสถิติการลาแบบหลายรูปแบบ (Multi-Format Document Generation: Excel & PDF)
- **Seam Interface**:
  - `exportExcel({ leaveRequests, queryParams, meta, res })` — สร้างไฟล์ Excel (.xlsx) พร้อมจัดรูปแบบตาราง, Merge Cells, Borders, และ Bold headers ด้วย ExcelJS
  - `exportPDF({ userGroups, queryParams, actor, res })` — สร้างไฟล์ PDF ตามมาตรฐานราชการด้วย PDFKit
- **Encapsulated Invariants**:
  - การจัดหมวดหมู่วันลาตามแบบมาตรฐาน ก.พ./มรภ.บุรีรัมย์ (`categorizeLeaveDays`)
  - ตัวแปลงวันที่และปีงบประมาณภาษาไทย (`formatThaiShortDate`, `formatPeriodLabel`)
  - การคำนวณพิกัดตาราง (Coordinate math), การตัดหน้าขึ้นหน้าใหม่ (Max 15 rows/page) พร้อม Running Header และ Running Summary
  - การโหลดและจัดการ Fallback Thai Font (`THSarabun.ttf` / `Mitr-Regular.ttf`) และตราสัญลักษณ์มหาวิทยาลัย
  - การประทับตรา Footer ท้ายกระดาษ (`OPR-HR-034`, รหัสผู้พิมพ์, วันที่พิมพ์, เลขหน้า `หน้า X / Y`)

### Real-Time Event Stream Engine (`SSEService`)
- **File**: `server/services/sseService.js`
- **Role**: จัดการการส่งข้อมูลแบบ Real-time (Unidirectional Server-Sent Events) ไปยัง Browser Client
- **Endpoint**: `GET /api/notifications/stream` — ต้องการ Authentication ผ่าน Cookie หรือ `?token=` query parameter (สำหรับ `EventSource` API)
- **Seam Interface**:
  - `addClient(userId, res, req)` — ลงทะเบียน SSE connection ใหม่
  - `sendToUser(userId, event, data)` — ส่ง event ไปยังผู้ใช้คนเดียว (รองรับ Multi-tabs/devices)
  - `sendToUsers(userIds, event, data)` — ส่ง event ไปยังหลายผู้ใช้พร้อมกัน
  - `broadcast(event, data)` — ส่ง event ไปยังผู้ใช้ทั้งหมด
- **Encapsulated Invariants**:
  - Connection Registry (`Map<userId, Set<res>>`) รองรับผู้ใช้เดียวหลาย Tab/Device
  - Heartbeat Ping (`:keep-alive\n\n`) ทุก 25 วินาที ป้องกัน Proxy/Nginx Timeout
  - ตัดการเชื่อมต่อและทำความสะอาด Memory ทันทีที่ Client ปิด Browser (`close` event)
  - รองรับ Authentication ผ่าน Cookie Token และ Query String Token (`?token=`) สำหรับ Web Browser `EventSource`

### Background Queue Manager (`QueueManager` / `EmailWorker`)
- **Files**: `server/queues/queueManager.js`, `server/queues/emailWorker.js`, `server/queues/inMemoryQueue.js`, `server/queues/index.js`
- **Role**: จัดการคิวงานพื้นหลังสำหรับการส่งอีเมลแจ้งเตือน โดยมี Fallback จาก BullMQ (Redis-backed) ไปยัง In-Memory Queue เมื่อ Redis ไม่พร้อมใช้งาน
- **Seam Interface** (ผ่าน `queues/index.js`):
  - `initQueues()` — เริ่มต้น BullMQ หรือ In-Memory Queue พร้อม Worker
  - `getQueueStats()` — ดึงสถิติคิว (waiting, active, completed, failed)
  - `closeQueues()` — ปิดคิวอย่าง graceful (ใช้ใน Graceful Shutdown handler)
- **Queue Types** (`queueTypes.js`): `LEAVE_CREATED` (แจ้งเตือนเมื่อมีใบลาใหม่), `LEAVE_STATUS_CHANGE` (แจ้งเตือนการเปลี่ยนสถานะ)
- **Email Provider**: ใช้ Nodemailer และ/หรือ Resend ตามค่า ENV configuration

### N8N Automation Service & Webhooks (`N8NService`)
- **Files**: `server/services/n8nService.js`, `server/controllers/webhookController.js`, `server/routes/webhooks.js`
- **Role**: เชื่อมต่อระบบ n8n Workflow Automation สำหรับ Notification Email และ Weekly Report
- **Endpoints**:
  - `GET /api/webhooks/weekly-report` — คืนสถิติการลาสัปดาห์สำหรับให้ n8n ดึงไปประมวลผลและส่งรายงาน
  - `POST /api/webhooks/n8n-callback` — รับ callback จาก n8n หลังจาก workflow ทำงานเสร็จ
- **Seam Interface**:
  - `triggerLeaveCreatedWebhook(leaveRequest, actor)` — ส่ง Webhook ไปยัง n8n เมื่อมีใบลาใหม่
  - `triggerLeaveStatusChangeWebhook(leaveRequest, oldStatus, action, actor)` — ส่ง Webhook เมื่อสถานะเปลี่ยน
  - `getStatusMetadata(status)` — คืน Thai label, currentStep (1-4), totalSteps, และ stepName
- **Encapsulated Invariants**:
  - ทุก Webhook call ใช้ `axios` พร้อม N8N_API_KEY header สำหรับ authentication
  - Error ใน Webhook dispatch ไม่ก่อให้เกิด failure ของ transaction หลัก (fire-and-forget + console.error)

### Client-Side PDF Generator (`generateLeavePDF`)
- **File**: `client/src/utils/generateLeavePDF.js` (~1,158 lines)
- **Role**: สร้าง PDF ใบลาทางการโดยการ overlay ข้อมูลลงบนเทมเพลต PDF มาตรฐานราชการฝั่ง Client (ไม่ผ่าน Server)
- **Libraries**: `pdf-lib`, `@pdf-lib/fontkit`, `jsPDF`
- **Seam Interface**:
  - `generateLeavePDF(leaveRequest, options)` — สร้างและดาวน์โหลด PDF ใบลา
  - `previewLeavePDF(leaveRequest, options)` — แสดง PDF ใบลาใน Browser Tab ใหม่
- **Template Files**: ผูก Leave Type Code กับไฟล์เทมเพลต PDF ที่ต่างกัน:
  - `sick/personal/maternity` → `แบบฟอร์มขอลาป่วย-ลากิจ-ลาคลอดบุตร.pdf`
  - `vacation` → `แบบฟอร์มลาพักผ่อน.pdf`
  - `paternity` → `แบบฟอร์มใบลาไปช่วยเหลือภริยาที่คลอดบุตร.pdf`
  - `ordination` → `แบบใบลาอุปสมบท.pdf`
- **Encapsulated Invariants**:
  - Embed Thai font (`THSarabunNew`) ด้วย fontkit สำหรับการพิมพ์ภาษาไทย
  - ฝังลายเซ็นดิจิทัลของผู้ขอลาและหัวหน้างานโดยอัตโนมัติ (อ่าน URL จาก `signatureImage`)
  - คำนวณวันที่เป็น พ.ศ. สำหรับแสดงในแบบฟอร์มราชการ

### Fiscal Year Rollover Job (`fiscalYearJob`)
- **File**: `server/jobs/fiscalYearJob.js`
- **Role**: Cron Job ทำงานอัตโนมัติทุกวันที่ 1 ตุลาคม เวลา 00:01 น. เพื่อตัดรอบยอดวันลาประจำปีและคำนวณวันลาพักผ่อนสะสม
- **Seam Interface**:
  - `initFiscalYearCron()` — ลงทะเบียน Cron Job ด้วย `node-cron`
- **Encapsulated Invariants**:
  - ดึงสิทธิ์วันลาพักผ่อนสะสมตามอายุราชการ (`startDate` → ปีบริการ)
  - คำนวณ `carriedOverDays` ตามเกณฑ์อายุงาน ≥ 10 ปี (สูงสุด 20 วัน) / < 10 ปี (สูงสุด 10 วัน)
  - สร้าง `LeaveBalance` records ใหม่สำหรับปีงบประมาณถัดไปพร้อม carried-over balance

### Client Collection Query Engine (`useCollectionQuery`)
- **File**: `client/src/hooks/useCollectionQuery.js`
- **Role**: Hook จัดการค้นหา กรองข้อมูลหลายมิติ จัดเรียง แบ่งหน้า และคำนวณสถิติอัตโนมัติบนฝั่ง Client
- **Seam Interface**:
  - `useCollectionQuery(items, { searchFields, initialFilters, filterExtractors, initialSort, pageSize, statsConfig })`
- **Encapsulated Invariants**:
  - การค้นหาแบบ Multi-Field พร้อม Deep Nested Path Resolution (`user.department.name`)
  - การกรองแบบ Multi-facet (Role, Faculty, Department, Status) และ Reset หน้าอัตโนมัติ
  - การคำนวณ Dynamic Statistics Cards (`stats.pending`, `stats.confirmed`, `stats.total`) จาก Dataset โดยตรง
  - การจัดเรียงภาษาไทยและตัวเลข (`localeCompare('th-TH', { numeric: true })`)

### Real-Time Notification Hook (`useRealtimeNotifications`)
- **File**: `client/src/hooks/useRealtimeNotifications.js`
- **Role**: Hook จัดการ SSE connection ฝั่ง Client สำหรับรับ Real-time Notifications และ invalidate TanStack Query cache โดยอัตโนมัติ
- **Seam Interface**:
  - `useRealtimeNotifications()` — เปิด `EventSource` connection ไปยัง `/api/notifications/stream`, จัดการ reconnect, และ invalidate query cache เมื่อรับ event

### TanStack Query Hooks (`hooks/queries/`)
- **Files**: `client/src/hooks/queries/useLeaveRequests.js`, `useUsers.js`, `useNotifications.js`, `useHolidays.js`, `useReferenceData.js`
- **Role**: Encapsulate API calls ด้วย TanStack Query v5 (`@tanstack/react-query`) จัดการ caching, loading states, optimistic updates, และ cache invalidation
- **Key Hooks**:
  - `usePendingLeaveRequests()` — ดึงรายการใบลาที่รอการอนุมัติ (สำหรับหน้า Approvals)
  - `useApproveLeaveRequest()` / `useRejectLeaveRequest()` — Mutation hooks สำหรับการอนุมัติ/ปฏิเสธ
  - `useLeaveRequests()` / `useAllLeaveRequests()` — ดึงรายการใบลาตามสิทธิ์ผู้ใช้

---

## 3. API Routes & Authentication

### Authentication & Authorization Middleware
- **File**: `server/middleware/auth.js`
- **Middleware Functions**:
  - `protect` — ตรวจสอบ JWT Token จาก HTTP-only Cookie, Authorization Bearer header, หรือ `?token=` query string; โหลด User พร้อม Department จาก DB
  - `admin` — อนุญาตเฉพาะ `role === "admin"`
  - `supervisor` — อนุญาต `role` ใดๆ ใน `["head", "dean", "vp", "admin"]`

### API Endpoints Summary

| Prefix | Router File | Controller |
|---|---|---|
| `/api/auth` | `routes/auth.js` | `authController.js` |
| `/api/users` | `routes/users.js` | `userController.js` |
| `/api/leave-requests` | `routes/leaveRequests.js` | `leaveRequestController.js` |
| `/api/leave-types` | `routes/leaveTypes.js` | `leaveTypeController.js` |
| `/api/holidays` | `routes/holidays.js` | `holidayController.js` |
| `/api/notifications` | `routes/notifications.js` | `notificationController.js` |
| `/api/reports` | `routes/reports.js` | `reportController.js` |
| `/api/webhooks` | `routes/webhooks.js` | `webhookController.js` |
| `/api/departments` | `routes/departments.js` | *(inline route handlers)* |
| `/api/faculties` | `routes/faculties.js` | *(inline route handlers)* |
| `/api/forms` | `routes/forms.js` | *(inline route handlers — static PDF files)* |

---

## 4. Database Schema (Sequelize Models)

| Model | Table | ฟิลด์สำคัญ |
|---|---|---|
| `User` | `users` | `employee_id`, `email`, `password` (bcrypt), `role` (ENUM 5 ค่า), `personnel_type`, `department_id`, `supervisor_id`, `signature_image`, `profile_image`, `start_date`, `is_active` |
| `Faculty` | `faculties` | `name`, `code` |
| `Department` | `departments` | `name`, `code`, `faculty_id` (FK Faculty) |
| `LeaveType` | `leave_types` | `name`, `code` (ENUM 8 ค่า), `default_days`, `requires_medical_cert`, `is_active` |
| `LeaveBalance` | `leave_balances` | `user_id`, `leave_type_id`, `year`, `allocated_days`, `used_days`, `carried_over_days` |
| `LeaveRequest` | `leave_requests` | `user_id`, `leave_type_id`, `start_date`, `end_date`, `total_days` (DECIMAL), `time_slot`, `status` (ENUM 7 ค่า), approval fields (Head/Dean/VP), `confirmed_by`, `cancelled_at` |
| `LeaveAttachment` | `leave_attachments` | `leave_request_id`, `file_name`, `file_path`, `file_type`, `file_size` |
| `LeaveHistory` | `leave_histories` | `leave_request_id`, `action`, `action_by`, `old_status`, `new_status`, `note` |
| `Holiday` | `holidays` | `name`, `date` (UNIQUE), `year`, `type` (ENUM: national/special/compensatory), `is_half_day` |
| `Notification` | `notifications` | `user_id`, `related_leave_id`, `message`, `is_read` |
