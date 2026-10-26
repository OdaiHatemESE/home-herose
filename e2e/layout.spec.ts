import { expect, test } from '@playwright/test';

test.describe('RTL, responsiveness and GitHub Pages routing', () => {
  test('Arabic is the default with right-to-left layout, and English flips it', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('كل بيت فيه أبطال');
    await page.getByRole('button', { name: 'اللغة' }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Every home has heroes');
  });

  test('pages never scroll horizontally on small screens', async ({ page }) => {
    for (const route of ['#/', '#/login', '#/child-login', '#/register', '#/privacy']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, route).toBeLessThanOrEqual(1);
    }
  });

  test('deep links survive a refresh under the Pages base path', async ({ page }) => {
    await page.goto('#/privacy');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'الخصوصية وحماية بيانات الأطفال' })).toBeVisible();
    const assetsOk = await page.evaluate(() =>
      [...document.querySelectorAll('script[src],link[rel=stylesheet]')].every((el) =>
        (el.getAttribute('src') ?? el.getAttribute('href') ?? '').includes('/home-heroes/'),
      ),
    );
    expect(assetsOk).toBe(true);
  });

  test('protected routes redirect anonymous visitors to sign in', async ({ page }) => {
    await page.goto('#/parent/settings');
    await expect(page).toHaveURL(/#\/login/);
    await page.goto('#/child');
    await expect(page).toHaveURL(/#\/child-login/);
  });
});
