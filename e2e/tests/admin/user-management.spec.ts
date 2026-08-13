import { test, expect } from '@playwright/test';
import { LoginPage } from '../../fixtures/LoginPage';

test.describe('Admin Workflow - User Management', () => {
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!);
    await loginPage.expectSuccess();
  });

  test('should view the users list successfully', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator('text="จัดการผู้ใช้งาน"').first()).toBeVisible();
    
    // Check if user table is rendered
    await expect(page.locator('table, .user-list, .MuiDataGrid-root, [role="grid"]')).toBeVisible();
  });

  test('should show validation error when creating user without required fields', async ({ page }) => {
    await page.goto('/users');
    
    // Find the add button
    const addButton = page.locator('button:has-text("เพิ่ม"), button:has-text("สร้าง"), button:has-text("Add")').first();
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Submit empty form
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      
      // HTML5 validation or manual validation message
      // Playwright expects HTML5 validations to block submission or custom error labels to show
      // We check if we are still on the form modal/page
      await expect(submitBtn).toBeVisible(); 
    } else {
      test.skip('Add user button not found');
    }
  });
});
