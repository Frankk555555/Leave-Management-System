import { test, expect } from '@playwright/test';

for (const viewport of [{ width: 1440, height: 760 }, { width: 390, height: 844 }]) {
  test(`filter menus preserve page scroll at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/**', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      let data: unknown = [];
      if (pathname === '/api/auth/me') {
        data = { id: 1, role: 'admin', firstName: 'Test', lastName: 'Admin' };
      } else if (pathname.includes('notifications')) {
        data = { notifications: [], unreadCount: 0 };
      }
      await route.fulfill({ json: data });
    });

    for (const [url, name] of [['/reports', 'ปีงบประมาณ (พ.ศ.)'], ['/calendar', 'เดือน']]) {
      await page.goto(url);
      const filter = page.getByRole('combobox', { name, exact: true });
      await filter.scrollIntoViewIfNeeded();
      const initialScroll = await page.evaluate(() => window.scrollY);
      await filter.click();
      const list = page.getByRole('listbox');
      await expect(list).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(initialScroll);

      await filter.press('End');
      await expect(list.getByRole('option').last()).toBeInViewport();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(initialScroll);
      if (url === '/calendar') {
        await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      }

      await filter.press('Enter');
      await expect(list).toHaveCount(0);
      await expect(filter).toBeFocused();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(initialScroll);
      await filter.click();
      await expect(list).toBeVisible();
      await filter.press('Escape');
      await expect(list).toHaveCount(0);
      await expect(filter).toBeFocused();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(initialScroll);
    }
  });
}
