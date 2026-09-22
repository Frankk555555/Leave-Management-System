# AGENTS.md — BRU LMS (Buriram Rajabhat University Leave Management System)

ระบบบริหารการลา มหาวิทยาลัยราชภัฏบุรีรัมย์: Full-stack Web Application (Node.js/Express + React 19/Vite) สำหรับบริหารจัดการการลาและเวิร์กโฟลว์อนุมัติ 3 ระดับตามระเบียบราชการ

---

## 1. Quick Reference Commands

คำสั่งสำคัญสำหรับการพัฒนาและทดสอบระบบ:

```bash
# ติดตั้ง dependencies ทั้งโปรเจกต์
npm install && npm --prefix client install && npm --prefix server install

# เริ่มต้นเซิร์ฟเวอร์สำหรับ Development (รันพร้อมกันทั้ง Client & Server)
npm run dev

# ทดสอบระบบ (Unit & Integration Tests)
npm test
npm --prefix server test
npm --prefix client test

# การจัดการฐานข้อมูล (Sequelize ORM)
npx sequelize-cli db:migrate
npx sequelize-cli db:seed:all

# Linting & Code Style
npm run lint
```

---

## 2. Core Architecture & Tech Stack

- **Frontend**: React 19, Vite 7, React Router v7, TanStack Query v5, Vanilla CSS Design System (WCAG 2.1 AA), `pdf-lib` + `@pdf-lib/fontkit` (Client-side PDF generation)
- **Backend**: Node.js, Express 4, Sequelize v6 (MySQL 8.0/MariaDB), BullMQ (Redis) พร้อม In-Memory Queue Fallback, Server-Sent Events (SSE)
- **Authentication**: JWT ผ่าน HTTP-only Cookie / Bearer Header / Query Parameter (`?token=` สำหรับ EventSource API)
- **External Integrations**: n8n Webhooks, Nodemailer/Resend, Cloudinary

---

## 3. Strict Rules & Architectural Invariants

เมื่อเขียนหรือแก้ไขโค้ด AI Agent ต้องปฏิบัติตามกฎเหล็กดังต่อไปนี้อย่างเคร่งครัด:

### กฎข้อที่ 1: สถานะคำขอและการเปลี่ยนสถานะ (Leave State Machine)
- ห้ามแก้ไขสถานะใบลาแบบ Ad-hoc ผ่าน Controller โดยตรง ต้องกระทำผ่าน Seam Interface ใน `server/services/leaveLifecycleService.js` (`create` หรือ `transition`) เท่านั้น
- สถานะใบลาทั้ง 7: `pending` → `pending_dean` → `pending_vp` → `approved` → `confirmed`, `rejected`, `cancelled`
- การตัดยอดวันลา (`LeaveBalance.increment("usedDays")`) เกิดขึ้นในขั้นตอน `confirmed` โดย Admin เท่านั้น
- การยกเลิก (`cancelled`) จากสถานะ `confirmed` ต้องคืนยอดวันลาเสมอ (`LeaveBalance.decrement("usedDays")`)
- รองรับ Skip-Tier Submission: `head` ยื่นคำขอเริ่มต้นที่ `pending_dean`, `dean` เริ่มต้นที่ `pending_vp`, และ `vp` เริ่มต้นที่ `approved`

### กฎข้อที่ 2: การจัดการฐานข้อมูลและ Transactions
- State transition ทุกครั้งต้องครอบด้วย Sequelize Transaction และใช้ Record Locking (`SELECT ... FOR UPDATE`) เสมอเพื่อป้องกัน Race Conditions
- บันทึกประวัติการเปลี่ยนสถานะลง `LeaveHistory` ภายใน Transaction เดียวกันเสมอ
- **ห้ามเรียก Third-party Side Effects ใน DB Transaction**: การส่ง SSE (`SSEService`), Email Queue (`QueueManager`) หรือ n8n Webhook (`N8NService`) ต้องทำหลัง `await t.commit()` เท่านั้น

### กฎข้อที่ 3: กฎระเบียบวันลาและปีงบประมาณ
- ปีงบประมาณราชการเริ่ม 1 ตุลาคม ถึง 30 กันยายนของปีถัดไป ใช้ `getFiscalYear(date)` ใน `leaveValidationService.js` เสมอ
- การนับวันลา (`totalDays`) รองรับทศนิยม 0.5 วัน (`full`, `morning`, `afternoon`) หักวันเสาร์-อาทิตย์และวันหยุดตามตาราง `holidays`

### กฎข้อที่ 4: ความปลอดภัยและการตรวจสอบสิทธิ์
- **Magic Bytes Verification**: การอัปโหลดไฟล์ (PDF/Image) ต้องผ่านการตรวจ Magic Bytes (`validateFileSignature.js`) นอกเหนือจาก MIME type
- **Department Isolation**: Approver (`head`) อนุมัติได้เฉพาะบุคลากรที่สังกัด `departmentId` เดียวกัน และห้ามอนุมัติใบลาของตนเองโดยเด็ดขาด
- **SSRF & SQL Guard**: ระบบ User Ingestion ต้องผ่าน `isSSRFSafeUrl` และบล็อกคำสั่ง SQL ที่ไม่ใช่ `SELECT` (`isReadOnlySelectQuery`)

---

## 4. Code Patterns & Idiomatic Examples

### 4.1 Backend: State Transition ใน `leaveLifecycleService.js`

```javascript
// ตัวอย่างรูปแบบการ Transition สถานะพร้อม Lock และบันทึกประวัติ
async function approveByHead(leaveRequestId, actor, comment) {
  const t = await sequelize.transaction();
  let updatedRequest;
  try {
    const leaveRequest = await LeaveRequest.findByPk(leaveRequestId, {
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (!leaveRequest || leaveRequest.status !== 'pending') {
      throw new Error('คำขอไม่อยู่ในสถานะที่สามารถอนุมัติได้');
    }

    if (leaveRequest.userId === actor.id) {
      throw new Error('ไม่อนุญาตให้อนุมัติคำขอลาของตนเอง');
    }

    // อัปเดตสถานะและข้อมูลการพิจารณา
    await leaveRequest.update({
      status: 'pending_dean',
      headApprovedBy: actor.id,
      headComment: comment,
      headApprovedAt: new Date()
    }, { transaction: t });

    // บันทึก Audit Log เสมอ
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      action: 'approved',
      actionBy: actor.id,
      oldStatus: 'pending',
      newStatus: 'pending_dean',
      note: comment
    }, { transaction: t });

    await t.commit();
    updatedRequest = leaveRequest;
  } catch (error) {
    await t.rollback();
    throw error;
  }

  // Side effects: กระทำนอก DB Transaction เท่านั้น
  SSEService.sendToUser(updatedRequest.userId, 'LEAVE_UPDATED', { id: updatedRequest.id, status: updatedRequest.status });
  N8NService.triggerLeaveStatusChangeWebhook(updatedRequest, 'pending', 'approved', actor);
  return updatedRequest;
}
```

### 4.2 Frontend: Data Mutation ด้วย TanStack Query v5

```javascript
// client/src/hooks/queries/useLeaveRequests.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/utils/axios';

export function useApproveLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, comment }) => {
      const { data } = await axios.post(`/api/leave-requests/${requestId}/approve`, { comment });
      return data;
    },
    onSuccess: () => {
      // Invalidate เพื่อบังคับให้โหลดรายการคำขอและยอดวันลาใหม่
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['leaveBalances'] });
    }
  });
}
```

---

## 5. Key File Paths & Seams

| ส่วนงาน / โมดูล | พาธไฟล์หลัก | หน้าที่สำคัญ |
|---|---|---|
| **Lifecycle State Machine** | `server/services/leaveLifecycleService.js` | ควบคุมการยื่น อนุมัติ ปฏิเสธ ยืนยัน และยกเลิกใบลา [1] |
| **Business Validation** | `server/services/leaveValidationService.js` | ตรวจสอบสิทธิ วันทำการ ปีงบประมาณ และเอกสารแนบ [1] |
| **Real-time SSE** | `server/services/sseService.js` | ส่ง Unidirectional Events ไปยังเบราว์เซอร์ [1] |
| **Batch Import & Sync** | `server/services/userIngestionService.js` | จัดการไฟล์ CSV/Excel, Remote SQL Sync และ SSRF Guard [1] |
| **Client PDF Generator** | `client/src/utils/generateLeavePDF.js` | พิมพ์ข้อมูลลงบนแบบฟอร์มราชการด้วย `pdf-lib` [1] |
| **Client Query Engine** | `client/src/hooks/useCollectionQuery.js` | ค้นหา กรอง และจัดเรียงข้อมูลแบบ Multi-facet ฝั่ง Client [1] |
| **Fiscal Rollover Cron** | `server/jobs/fiscalYearJob.js` | ตัดยอดวันลาประจำปีอัตโนมัติทุกวันที่ 1 ตุลาคม [1, 2] |

---

## 6. UI Component Guidelines (Design Tokens & WCAG 2.1 AA)

ฝั่ง Frontend ใช้ **Vanilla CSS ร่วมกับ Design Tokens (CSS Variables)** และต้องปฏิบัติตามมาตรฐานการเข้าถึงอย่างเคร่งครัด:

### กฎการจัดสไตล์และ CSS Variables
* **ห้าม Hardcode ค่าสีและขนาด:** ให้ใช้ CSS Tokens กลางที่ประกาศไว้ในระบบเสมอ:
  * **Color Tokens:** `var(--color-primary)`, `var(--color-surface)`, `var(--color-text-main)`, `var(--color-text-muted)`, `var(--color-border)`
  * **Status Colors:** `var(--status-pending)`, `var(--status-approved)`, `var(--status-rejected)`, `var(--status-confirmed)`
  * **Spacing & Radius:** `var(--spacing-xs)` ถึง `var(--spacing-xl)`, `var(--radius-sm)` ถึง `var(--radius-lg)`
* **Reduced Motion:** ทุก Transition/Animation ต้องครอบด้วย Media Query ลดการเคลื่อนไหวเสมอ:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

### ข้อกำหนด WCAG 2.1 AA Checklist
* **Color Contrast:** อัตราส่วนความต่างของสี (Contrast Ratio) สำหรับข้อความปกติกับพื้นหลังต้อง ≥ 4.5:1 (ข้อความขนาดใหญ่ ≥ 3:1)
* **Keyboard Navigation:** องค์ประกอบเชิงโต้ตอบ (Interactive Elements) ทุกตัวต้องเข้าถึงได้ด้วยปุ่ม `Tab` และมีเส้นขอบ Focus ที่มองเห็นได้ชัดเจน (`outline: 2px solid var(--color-focus-ring)`) ห้ามใส่ `outline: none` โดยไม่มี Fallback
* **Accessible Forms:** Input ทุกฟิลด์ต้องมี `<label>` ที่ผูกคู่กับ `id` เสมอ และต้องใส่ `aria-describedby` ชี้ไปยังข้อความแจ้งข้อผิดพลาดเมื่อเกิดสถานะ Invalid
* **ARIA Live Regions:** ป้ายสถานะ (Badges) หรือข้อความแจ้งเตือนที่มีการอัปเดตแบบ Dynamic จาก SSE ต้องใส่ `aria-live="polite"` หรือ `role="status"`

#### ตัวอย่างโค้ด UI Component:
```jsx
// client/src/components/LeaveStatusBadge.jsx
import React from 'react';
import './LeaveStatusBadge.css';

export function LeaveStatusBadge({ status, label }) {
  return (
    <span 
      className={`status-badge status-badge--${status}`}
      role="status"
      aria-live="polite"
    >
      <span className="status-badge__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
```

```css
/* client/src/components/LeaveStatusBadge.css */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.25;
}

.status-badge--pending {
  background-color: var(--status-pending-bg);
  color: var(--status-pending-text); /* ผ่าน Contrast Ratio >= 4.5:1 */
  border: 1px solid var(--status-pending-border);
}
```

---

## 7. Integration Testing Specifications

Integration Tests ควบคุมคุณภาพของ Flow ธุรกิจสำคัญ โดยจำลองการทำงานตั้งแต่ Route/Controller ลงไปจนถึง Database Transaction:

### สภาพแวดล้อมและข้อบังคับการทดสอบ
* **Isolated Transactions:** ทุก Test Suite ต้องรันบน Test Database แยก และต้องทำ Rollback หรือเคลียร์ตารางหลังจากแต่ละ Case เสมอ
* **Mock Third-party Side Effects เสมอ:**
  * Mock `SSEService.sendToUser` และ `SSEService.broadcast`
  * Mock `QueueManager.addJob` / `EmailWorker`
  * Mock `N8NService.triggerLeaveCreatedWebhook` และ Callback URLs
* **Concurreny & Race Conditions:** ต้องมี Test Case ที่ทดสอบ `SELECT ... FOR UPDATE` โดยส่ง Request อนุมัติพร้อมกัน 2 ครัั้ง เพื่อยืนยันว่าไม่มี Double Transition [1, 2]

### Test Matrix ที่ต้องมีใน `server/__tests__/integration/`
1. **Full Lifecycle Approval Flow:**
   * Employee ยื่นคำขอ (`pending`) [1, 2]
   * Head อนุมัติ Tier 1 (`pending_dean`) [1, 2]
   * Dean อนุมัติ Tier 2 (`pending_vp`) [1, 2]
   * VP มีคำสั่งอนุญาต Tier 3 (`approved`) [1, 2]
   * Admin ยืนยันคำขอ (`confirmed`) พร้อม Assert ว่า `LeaveBalance.usedDays` ถูกตัดยอดตามจำนวนวันจริง [1, 2]
2. **Skip-Tier Submission:**
   * ตรวจสอบว่าคำขอที่สร้างโดย `head` มีสถานะเริ่มต้นเป็น `pending_dean` ทันที [1]
   * ตรวจสอบว่าคำขอที่สร้างโดย `dean` มีสถานะเริ่มต้นเป็น `pending_vp` ทันที [1]
   * ตรวจสอบว่าคำขอที่สร้างโดย `vp` มีสถานะเริ่มต้นเป็น `approved` ทันที [1]
3. **Authorization & Department Isolation:**
   * ผู้ใช้พยายามอนุมัติคำขอของตนเอง → ต้องตอบกลับ `403 Forbidden` หรือ `400 Bad Request` [1]
   * `head` แผนก A พยายามอนุมัติคำขอของสมาชิกแผนก B → ต้องถูกปฏิเสธด้วย `403 Forbidden` [1, 2]
4. **Cancellation & Balance Reversal:**
   * คำขอสถานะ `confirmed` ถูกยกเลิกโดย Admin → ต้อง Assert ว่า `LeaveBalance.usedDays` ลดลงคืนสิทธิ์เต็มจำนวน [1, 2]

#### ตัวอย่างโค้ด Integration Test (Jest + Supertest):
```javascript
// server/__tests__/integration/leaveLifecycle.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, LeaveRequest, LeaveBalance, User } = require('../../models');
const { sseService } = require('../../services/sseService');

jest.mock('../../services/sseService');
jest.mock('../../services/n8nService');

describe('Integration: Multi-tier Approval & Balance Deduction', () => {
  let employeeToken, headToken, adminToken;
  let leaveRequestId, testUserId, leaveTypeId;

  beforeEach(async () => {
    // Setup test users, authentication tokens, and initial leave balance
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should transition from pending to confirmed and properly deduct balance', async () => {
    // 1. Employee ยื่นคำขอลา
    const createRes = await request(app)
      .post('/api/leave-requests')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        leaveTypeId,
        startDate: '2026-10-05',
        endDate: '2026-10-06',
        timeSlot: 'full',
        reason: 'ลากิจส่วนตัวจำเป็น'
      });

    expect(createRes.status).toBe(201);
    leaveRequestId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('pending');

    // 2. Head อนุมัติ Tier 1
    const headRes = await request(app)
      .post(`/api/leave-requests/${leaveRequestId}/approve`)
      .set('Authorization', `Bearer ${headToken}`)
      .send({ comment: 'เห็นควรอนุมัติ' });

    expect(headRes.status).toBe(200);
    expect(headRes.body.data.status).toBe('pending_dean');

    // 3. Admin ทำการ Confirm และตัดยอดวันลา
    const confirmRes = await request(app)
      .post(`/api/leave-requests/${leaveRequestId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send();

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.status).toBe('confirmed');

    // 4. Assert ว่ายอดวันลาถูกหักในตาราง LeaveBalance
    const balance = await LeaveBalance.findOne({
      where: { userId: testUserId, leaveTypeId, year: 2027 }
    });
    expect(parseFloat(balance.usedDays)).toBe(2.0);

    // Assert ว่า Side Effect ถูกยิงหลัง commit
    expect(sseService.sendToUser).toHaveBeenCalledWith(
      testUserId,
      'LEAVE_STATUS_UPDATED',
      expect.objectContaining({ status: 'confirmed' })
    );
  });
});
```
