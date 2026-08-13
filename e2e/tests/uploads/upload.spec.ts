import { test, expect } from '@playwright/test';
import { LoginPage } from '../../fixtures/LoginPage';
import { LeaveRequestPage } from '../../fixtures/LeaveRequestPage';
import * as path from 'path';

test.describe('File Upload Tests', () => {
  let leavePage: LeaveRequestPage;

  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.E2E_TEACHER_EMAIL!, process.env.E2E_TEACHER_PASSWORD!);
    await loginPage.expectSuccess();
    
    leavePage = new LeaveRequestPage(page);
    await leavePage.goto();
  });

  test('should upload a valid PDF attachment successfully', async ({ page }) => {
    await leavePage.selectLeaveType('sick');
    
    // Set dates
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    await leavePage.fillForm({
      startDate: dateStr,
      endDate: dateStr,
      reason: 'E2E Testing Sick Leave with PDF'
    });

    // Check hasMedicalCertificate
    const checkbox = page.locator('input[name="hasMedicalCertificate"]');
    if (await checkbox.isVisible()) {
      await checkbox.check();
    }

    // Attach file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../../fixtures/files/dummy.pdf'));
    
    // Check if the file is visible in UI list
    await expect(page.locator('.file-item, text="dummy.pdf"').first()).toBeVisible();
    
    await leavePage.submit();
    await leavePage.expectSuccessModal();
  });

  test('should show warning for unsupported file extension (frontend check)', async ({ page }) => {
    // Assuming the file input has an accept attribute that restricts to certain types
    const fileInput = page.locator('input[type="file"]');
    
    // Playwright lets you bypass `accept` if you really want, but we will test it.
    await fileInput.setInputFiles(path.join(__dirname, '../../fixtures/files/malicious.exe'));
    
    // In many apps, attaching an invalid file triggers an immediate toast or error
    // Alternatively, if it submits, it should fail backend validation
    
    // If it doesn't fail immediately, try to submit:
    await leavePage.selectLeaveType('personal');
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    await leavePage.fillForm({ startDate: dateStr, endDate: dateStr, reason: 'Testing invalid extension' });
    
    // Because this file extension is not allowed, it might fail on submission
    await leavePage.submit();
    
    // Expect error toast from backend or frontend
    await expect(page.locator('.error-message, .Toastify, text="ไม่สำเร็จ", text="Only images"').first()).toBeVisible();
  });
});
