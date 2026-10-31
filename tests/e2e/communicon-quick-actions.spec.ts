/**
 * CommuniCon's + in the message box opens a "Quick actions" sheet, so the bot's
 * actions stay one tap away after the starter chips have gone.
 *
 * Sandbox session plus a fake Supabase session (the verification flow loads the
 * owner's businesses with it); chat-ai and the Supabase tables are mocked.
 */
import { test, expect, type Page } from '@playwright/test';
import { SANDBOX_MOCK_KEY, STORAGE_KEY, mockUser } from './helpers/mapMocks';

const UID = mockUser.uid;
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const EXP = Math.floor(Date.now() / 1000) + 3600;
const fakeSession = {
  access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, exp: EXP, role: 'authenticated', aud: 'authenticated' })}.sig`,
  refresh_token: 'fake-refresh',
  expires_in: 3600,
  expires_at: EXP,
  token_type: 'bearer',
  user: { id: UID, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};

async function setup(page: Page) {
  await page.route('**/pi-sdk.js', (route) => route.abort());
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: fakeSession.user }));
  for (const t of ['users', 'user_roles', 'conversations', 'messages', 'notifications']) {
    await page.route(`**/rest/v1/${t}*`, (route) => route.fulfill({ json: [] }));
  }
  await page.route('**/rest/v1/businesses*', (route) =>
    route.fulfill({ json: [{ id: 9001, business_name: 'Harbour Light Coffee', verification_status: null, is_verified: false, created_at: '2026-10-01T00:00:00Z' }] }),
  );
  await page.route('**/functions/v1/chat-ai', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ choices: [{ delta: { content: 'Open Your businesses from the menu and tap Update.' } }] })}\n\ndata: [DONE]\n\n`,
    }),
  );
  await page.addInitScript(
    ([mockKey, storageKey, user, session]) => {
      localStorage.setItem(mockKey as string, '1');
      localStorage.setItem(storageKey as string, JSON.stringify({ ...(user as object), lastAuthenticated: Date.now() }));
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    },
    [SANDBOX_MOCK_KEY, STORAGE_KEY, mockUser, fakeSession],
  );
  await page.goto('/communicon');
  await expect(page.getByRole('tab', { name: 'Bot' })).toBeVisible();
}

const plus = (page: Page) => page.getByRole('button', { name: 'Quick actions' });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Quick actions' });
const input = (page: Page) => page.getByPlaceholder('Ask about your business...');

async function sendMessage(page: Page, text: string) {
  await input(page).fill(text);
  await input(page).press('Enter');
  await expect(page.getByText(text)).toBeVisible();
}

async function openSheet(page: Page) {
  await plus(page).tap();
  await expect(sheet(page)).toBeVisible();
  // Let the slide-in finish before tapping inside it
  await page.waitForTimeout(600);
}

test.describe('375x812', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('the + is in the Bot input, not on the Messages tab', async ({ page }) => {
    await setup(page);
    await expect(plus(page)).toBeVisible();
    await expect(plus(page)).toHaveAttribute('aria-haspopup', 'dialog');
    await expect(plus(page)).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('tab', { name: 'Messages' }).tap();
    await expect(page.getByRole('tab', { name: 'Messages' })).toHaveAttribute('aria-selected', 'true');
    await expect(plus(page)).toHaveCount(0);
  });

  test('+ opens "Quick actions" with 4 rows; Certification is disabled; the + turns solid', async ({ page }) => {
    await setup(page);
    await openSheet(page);
    await expect(sheet(page).getByRole('heading', { name: 'Quick actions' })).toBeVisible();
    const rows = sheet(page).getByRole('listitem');
    await expect(rows).toHaveCount(4);
    await expect(rows).toContainText(['Check verification status', 'My listings', 'Message a business', 'Certification']);
    const cert = sheet(page).getByRole('button', { name: /Certification/ });
    await expect(cert).toBeDisabled();
    await expect(cert).toHaveAttribute('aria-disabled', 'true');
    await expect(cert).toContainText('Coming soon');
    for (const name of [/Check verification status/, /My listings/, /Message a business/]) {
      await expect(sheet(page).getByRole('button', { name })).toBeEnabled();
    }
    for (const row of await rows.all()) expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(64);
    // Behind the open sheet the page is aria-hidden, so find the + by its label attribute
    const plusBehind = page.locator('button[aria-label="Quick actions"]');
    await expect(plusBehind).toHaveAttribute('aria-expanded', 'true');
    await expect(plusBehind).toHaveClass(/bg-primary/);
  });

  test('after the chips are gone, + → "Check verification status" runs the chip flow and closes the sheet', async ({ page }) => {
    await setup(page);
    await sendMessage(page, 'How do I add photos?');
    await expect(page.getByRole('button', { name: 'Check verification status' })).toHaveCount(0);
    await openSheet(page);
    await sheet(page).getByRole('button', { name: /Check verification status/ }).tap();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.getByText('Select your business:')).toBeVisible();
    await expect(page.getByRole('button', { name: /Harbour Light Coffee/ })).toBeVisible();
  });

  test('+ → "Message a business" switches to the Messages tab', async ({ page }) => {
    await setup(page);
    await openSheet(page);
    await sheet(page).getByRole('button', { name: /Message a business/ }).tap();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.getByRole('tab', { name: 'Messages' })).toHaveAttribute('aria-selected', 'true');
  });

  test('the close button, a scrim tap and Escape all close it, and focus returns to the +', async ({ page }) => {
    await setup(page);

    await openSheet(page);
    await sheet(page).getByRole('button', { name: 'Close' }).tap();
    await expect(sheet(page)).toHaveCount(0);
    await expect(plus(page)).toBeFocused();
    await expect(plus(page)).toHaveAttribute('aria-expanded', 'false');

    await openSheet(page);
    await page.touchscreen.tap(187, 120);
    await expect(sheet(page)).toHaveCount(0);
    await expect(plus(page)).toBeFocused();

    await openSheet(page);
    await page.keyboard.press('Escape');
    await expect(sheet(page)).toHaveCount(0);
    await expect(plus(page)).toBeFocused();
  });
});

for (const width of [320, 375]) {
  test(`at ${width}px the +, the input and the send button don't overlap`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await setup(page);
    await input(page).fill('Hello');
    const p = (await plus(page).boundingBox())!;
    const i = (await input(page).boundingBox())!;
    const s = (await page.getByRole('button', { name: 'Send' }).boundingBox())!;
    expect(Math.round(p.width)).toBe(44);
    expect(Math.round(p.height)).toBe(44);
    expect(p.x).toBeGreaterThanOrEqual(0);
    expect(p.x + p.width).toBeLessThanOrEqual(i.x + 0.5);
    expect(i.x + i.width).toBeLessThanOrEqual(s.x + 0.5);
    expect(s.x + s.width).toBeLessThanOrEqual(width);
    expect(i.width).toBeGreaterThan(100);
  });
}
