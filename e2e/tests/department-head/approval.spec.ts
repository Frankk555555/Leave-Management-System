import { test, expect } from '@playwright/test';
import { LoginPage } from '../../fixtures/LoginPage';
import { ApprovalsPage } from '../../fixtures/ApprovalsPage';

test.describe('Department Head Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Head
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.E2E_HEAD_EMAIL!, process.env.E2E_HEAD_PASSWORD!);
    await loginPage.expectSuccess();
  });

  test('should access approvals page successfully', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();
    await approvalsPage.expectToBeVisible();
  });

  // Note: These tests require a pending leave request to exist in the database,
  // which might not be guaranteed unless seeded or created in a beforeAll block.
  // This is a basic outline.
  
  test('should approve a pending request', async ({ page }) => {
    const approvalsPage = new ApprovalsPage(page);
    await approvalsPage.goto();
    
    // Only attempt if there is at least one request pending
    const noDataText = page.locator('text="ไม่มีข้อมูล"');
    if (await noDataText.isVisible()) {
      test.skip('No pending requests to approve');
      return;
    }

    await approvalsPage.approveFirstRequest();
    // Expect success toast
    await expect(page.locator('.Toastify, text="อนุมัติสำเร็จ"')).toBeVisible();
  });
});
