import { test, expect } from '@playwright/test';

for (const width of [320, 390]) {
  test(`mobile navbar stays fixed and pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (path === '/api/auth/me') data = { id: 1, role: 'admin', firstName: 'Test', lastName: 'Admin' };
      if (path.includes('notifications')) data = { notifications: [], unreadCount: 0 };
      await route.fulfill({ json: data });
    });
    for (const path of ['/reports', '/leave-types']) {
      await page.goto(path);
      const header = page.locator('.mobile-header');
      await expect(header).toHaveCSS('position', 'fixed');
      await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      const initial = await header.boundingBox();
      const content = page.locator('.main-content');
      const contentBox = await content.boundingBox();
      expect(contentBox?.y).toBe((initial?.y || 0) + (initial?.height || 0));
      await content.evaluate((el) => {
        const spacer = document.createElement('div');
        spacer.style.cssText = 'height:2500px;flex-shrink:0';
        el.append(spacer);
      });
      for (const top of [450, 50, 1000]) {
        await content.evaluate((el, top) => el.scrollTo({ top, left: 50, behavior: 'instant' }), top);
        await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBe(top);
        await expect.poll(() => header.boundingBox()).toEqual(initial);
        await expect.poll(() => page.evaluate(() => window.scrollX)).toBe(0);
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      }
      await page.locator('.hamburger-btn').click();
      await expect(page.locator('body')).toHaveCSS('overflow-y', 'hidden');
      await expect(content).toHaveCSS('overflow-y', 'hidden');
      await page.keyboard.press('Escape');
      await expect(page.locator('.sidebar.open')).toHaveCount(0);
      await expect(content).toHaveCSS('overflow-y', 'auto');
      await expect.poll(() => header.boundingBox()).toEqual(initial);
    }
  });
}
