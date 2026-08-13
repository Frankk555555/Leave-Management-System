import { Page, expect } from '@playwright/test';

export class ApprovalsPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/approvals');
  }

  async expectToBeVisible() {
    await expect(this.page).toHaveURL(/\/approvals/);
    await expect(this.page.locator('text="คำขออนุมัติการลา"')).toBeVisible();
  }

  async approveFirstRequest() {
    // This is a naive implementation; normally you'd use a specific testId or row
    const approveButton = this.page.locator('button:has-text("อนุมัติ")').first();
    await approveButton.click();
    
    // Accept confirm dialog if any
    const confirmButton = this.page.locator('.swal2-confirm, button:has-text("ยืนยัน")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }
  }

  async rejectFirstRequest(reason: string) {
    const rejectButton = this.page.locator('button:has-text("ไม่อนุมัติ")').first();
    await rejectButton.click();
    
    // Fill reason if a modal pops up
    const reasonInput = this.page.locator('textarea[placeholder*="เหตุผล"]');
    if (await reasonInput.isVisible()) {
      await reasonInput.fill(reason);
      const confirmButton = this.page.locator('.swal2-confirm, button:has-text("ยืนยัน")');
      await confirmButton.click();
    }
  }
}
