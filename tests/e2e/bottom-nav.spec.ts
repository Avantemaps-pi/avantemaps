/**
 * Navigation: CommuniCon is a bottom-nav tab (Wallet moved to the side menu).
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

  test('the bottom nav has CommuniCon and no Wallet; tapping it opens CommuniCon, active', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation').last();
    await expect(nav.getByRole('link')).toHaveText(['Discover', 'Saved', 'Map', 'CommuniCon', 'Settings']);
    await expect(nav.getByRole('link', { name: 'Wallet' })).toHaveCount(0);

    await nav.getByRole('link', { name: 'CommuniCon' }).tap();
    await page.waitForURL('**/communicon');
    await expect(page.getByRole('navigation').last().getByRole('link', { name: 'CommuniCon' })).toHaveClass(/text-primary/);
    await expect(page.getByRole('navigation').last().getByRole('link', { name: 'Map' })).not.toHaveClass(/text-primary/);
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
});
