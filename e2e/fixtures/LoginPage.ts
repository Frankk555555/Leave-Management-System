import { Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.fill('input[type="password"]', password);
    await this.page.click('button[type="submit"]');
  }

  async expectSuccess() {
    await expect(this.page).toHaveURL(/\/dashboard/);
  }

  async expectError(message: string) {
    const errorLocator = this.page.locator('.error-message');
    await expect(errorLocator).toBeVisible();
    await expect(errorLocator).toContainText(message);
  }
}
