import { Page, expect } from '@playwright/test';

export class LeaveRequestPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/leave-request');
  }

  async selectLeaveType(type: string) {
    // The radio input is sr-only, so we need to click its parent label or div
    await this.page.locator(`input[name="leaveType"][value="${type}"]`).locator('..').click();
  }

  async fillForm(data: { startDate: string, endDate: string, reason: string }) {
    await this.page.fill('input[name="startDate"]', data.startDate);
    await this.page.fill('input[name="endDate"]', data.endDate);
    await this.page.fill('textarea[name="reason"]', data.reason);
  }

  async submit() {
    await this.page.click('button[type="submit"]');
  }

  async expectSuccessModal() {
    // Look for success modal or toast
    await expect(this.page.locator('.success-modal, .swal2-success, .Toastify, text="สำเร็จ"')).toBeVisible();
  }
}
