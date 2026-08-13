import { test, expect } from '@playwright/test';
import { LoginPage } from '../../fixtures/LoginPage';

test.describe('Authentication E2E Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should login successfully with valid credentials', async () => {
    await loginPage.login(process.env.E2E_TEACHER_EMAIL!, process.env.E2E_TEACHER_PASSWORD!);
    await loginPage.expectSuccess();
  });

  test('should show error with invalid password', async () => {
    await loginPage.login(process.env.E2E_TEACHER_EMAIL!, 'wrongpassword');
    await loginPage.expectError('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); // Adjust based on actual API error message
  });

  test('should show error with invalid email format', async ({ page }) => {
    await loginPage.login('invalidemail', 'password');
    // HTML5 validation usually catches this, but we can check if it stays on login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should not access protected route without authentication', async ({ page }) => {
    await page.goto('/dashboard');
    // It should redirect back to login
    await expect(page).toHaveURL(/.*login/);
  });
});
