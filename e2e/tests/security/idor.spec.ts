import { test, expect } from '@playwright/test';
import { LoginPage } from '../../fixtures/LoginPage';

test.describe('Security & Authorization Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
  });

  test('Teacher should not be able to access Admin users page', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(process.env.E2E_TEACHER_EMAIL!, process.env.E2E_TEACHER_PASSWORD!);
    await loginPage.expectSuccess();
    
    // Try to navigate to admin users page
    await page.goto('/users');
    
    // Should be redirected or shown forbidden
    await expect(page).not.toHaveURL(/\/users/);
    await expect(page.locator('text="จัดการผู้ใช้งาน"')).not.toBeVisible();
  });

  test('Teacher should not be able to access Head approvals page', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login(process.env.E2E_TEACHER_EMAIL!, process.env.E2E_TEACHER_PASSWORD!);
    await loginPage.expectSuccess();
    
    // Try to navigate to approvals page
    await page.goto('/approvals');
    
    // Should be redirected
    await expect(page).not.toHaveURL(/\/approvals/);
  });

  test('Unauthenticated user should be redirected to login on protected routes', async ({ page }) => {
    // Clear cookies/storage explicitly (Playwright isolates contexts by default anyway)
    await page.context().clearCookies();
    
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
    
    await page.goto('/leave-request');
    await expect(page).toHaveURL(/.*login/);
  });
});
