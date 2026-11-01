/**
 * Navigation: CommuniCon is a bottom-nav tab (Wallet moved to the side menu).
 * The CommuniCon page itself hides the bottom nav; its header has a back arrow
 * instead of ☰ (to the map when there's no earlier page in the app).
 * On phones the side menu shows Wallet but not CommuniCon (it's in the bottom
 * nav); the desktop side menu, with no bottom nav, lists both.
 *
 * Sandbox mock session; the map's outside calls are mocked.
 */
import { test, expect } from '@playwright/test';
import { mockMap, NEARBY_BUSINESSES } from './helpers/mapMocks';

const SUPABASE = 'https://xvpwbocwasbtzrzrxyvu.supabase.co';

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await page.route(`${SUPABASE}/**`, (route) => route.fulfill({ json: [] }));
    await mockMap(page, NEARBY_BUSINESSES);
  });

  test('the bottom nav has CommuniCon and no Wallet; tapping it opens CommuniCon, without the nav', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation').last();
    await expect(nav.getByRole('link')).toHaveText(['Discover', 'Saved', 'Map', 'CommuniCon', 'Settings']);
    await expect(nav.getByRole('link', { name: 'Wallet' })).toHaveCount(0);

    await nav.getByRole('link', { name: 'CommuniCon' }).tap();
    await page.waitForURL('**/communicon');
    await expect(page.getByRole('tab', { name: 'Bot' })).toBeVisible();
    await expect(page.locator('nav.fixed')).toHaveCount(0);
  });

  test('CommuniCon has "Go back" (44x44) instead of the menu, title centred', async ({ page }) => {
    await page.goto('/communicon');
    await expect(page.getByRole('tab', { name: 'Bot' })).toBeVisible();
    const back = page.getByRole('button', { name: 'Go back' });
    await expect(back).toBeVisible();
    const box = (await back.boundingBox())!;
    expect(Math.round(box.width)).toBe(44);
    expect(Math.round(box.height)).toBe(44);
    await expect(page.getByRole('button', { name: 'Open menu' })).toHaveCount(0);
    const title = (await page.locator('#page-title').boundingBox())!;
    expect(Math.abs(title.x + title.width / 2 - 375 / 2)).toBeLessThanOrEqual(30);
  });

  test('map → CommuniCon tab → Go back returns to the map', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation').last().getByRole('link', { name: 'CommuniCon' }).tap();
    await page.waitForURL('**/communicon');
    await page.getByRole('button', { name: 'Go back' }).tap();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test('Discover → CommuniCon → Go back returns to Discover', async ({ page }) => {
    await page.goto('/recommendations');
    await page.getByRole('navigation').last().getByRole('link', { name: 'CommuniCon' }).tap();
    await page.waitForURL('**/communicon');
    await page.getByRole('button', { name: 'Go back' }).tap();
    await page.waitForURL('**/recommendations');
  });

  test('CommuniCon loaded directly: Go back lands on the map', async ({ page }) => {
    await page.goto('/communicon');
    await expect(page.getByRole('tab', { name: 'Bot' })).toBeVisible();
    await page.getByRole('button', { name: 'Go back' }).tap();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.getByRole('navigation').last().getByRole('link', { name: 'Map' })).toBeVisible();
  });

  for (const width of [320, 375]) {
    test(`"CommuniCon" fits on one line at ${width}px without touching its neighbours`, async ({ page }) => {
      await page.setViewportSize({ width, height: 700 });
      await page.goto('/');
      await expect(page.getByRole('navigation').last().getByRole('link', { name: 'CommuniCon' })).toBeVisible();
      const labels = await page.getByRole('navigation').last().locator('a > span:last-child').evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { text: el.textContent, left: r.left, right: r.right, height: r.height, lineHeight: parseFloat(getComputedStyle(el).lineHeight) || r.height };
        }),
      );
      const cc = labels.find((l) => l.text === 'CommuniCon')!;
      expect(cc.height).toBeLessThanOrEqual(cc.lineHeight + 1);
      for (let i = 1; i < labels.length; i++) expect(labels[i]!.left).toBeGreaterThanOrEqual(labels[i - 1]!.right);
    });
  }

  test('the mobile side menu shows Wallet and not CommuniCon', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).first().tap();
    const menu = page.getByRole('link', { name: 'Wallet' });
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('href', '/wallet');
    // Only the bottom nav's CommuniCon, none in the menu
    await expect(page.getByRole('link', { name: 'CommuniCon' })).toHaveCount(1);
    await expect(page.getByRole('navigation').last().getByRole('link', { name: 'CommuniCon' })).toHaveCount(1);
  });
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('the desktop side menu lists Wallet and CommuniCon', async ({ page }) => {
    await page.route(`${SUPABASE}/**`, (route) => route.fulfill({ json: [] }));
    await mockMap(page, NEARBY_BUSINESSES);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Wallet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'CommuniCon' })).toBeVisible();
    // No bottom nav on desktop
    await expect(page.locator('nav.fixed')).toHaveCount(0);
  });

  test('on CommuniCon the desktop side menu is still there', async ({ page }) => {
    await page.route(`${SUPABASE}/**`, (route) => route.fulfill({ json: [] }));
    await page.goto('/communicon');
    await expect(page.getByRole('tab', { name: 'Bot' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wallet' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'CommuniCon' })).toBeVisible();
  });
});
