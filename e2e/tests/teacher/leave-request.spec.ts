import { test, expect } from '@playwright/test';
import { LoginPage } from '../../fixtures/LoginPage';
import { LeaveRequestPage } from '../../fixtures/LeaveRequestPage';

test.describe('Teacher Leave Request Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.E2E_TEACHER_EMAIL!, process.env.E2E_TEACHER_PASSWORD!);
    await loginPage.expectSuccess();
  });

  test('should submit a personal leave request successfully', async ({ page }) => {
    const leavePage = new LeaveRequestPage(page);
    await leavePage.goto();
    
    // Fill out the form
    await leavePage.selectLeaveType('personal');
    
    // Set dates for tomorrow
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    await leavePage.fillForm({
      startDate: dateStr,
      endDate: dateStr,
      reason: 'E2E Testing Personal Leave'
    });
    
    await leavePage.submit();
    await leavePage.expectSuccessModal();
  });

  test('should fail validation if reason is empty', async ({ page }) => {
    const leavePage = new LeaveRequestPage(page);
    await leavePage.goto();
    
    await leavePage.selectLeaveType('personal');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    await leavePage.fillForm({
      startDate: dateStr,
      endDate: dateStr,
      reason: ''
    });
    
    // Browsers often block submit if 'required' is present
    await leavePage.submit();
    
    // Ensure we are still on the form
    await expect(page).toHaveURL(/.*leave-request/);
  });
});
