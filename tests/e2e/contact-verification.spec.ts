/**
 * CommuniCon's business verification: the Contact information check follows
 * the server (verify-business's contactConfirmed and reason), the code only
 * goes to the business's contact email, and each contact-otp error_code gets
 * its own message.
 *
 * 375x812 with the sandbox session and a fake Supabase session (the bot loads
 * the owner's businesses with it). verify-business and contact-otp are mocked.
 */
import { test, expect, type Page, type Request } from '@playwright/test';
import { SANDBOX_MOCK_KEY, STORAGE_KEY, mockUser } from './helpers/mapMocks';

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

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

const BUSINESS = { id: 9001, business_name: 'Harbour Light Coffee', verification_status: null, is_verified: false, created_at: '2026-10-01T00:00:00Z' };

interface Setup {
  contactEmail?: string | null;
  contactConfirmed?: boolean;
  reason?: string | null;
  send?: { status: number; body: object };
  verify?: { status: number; body: object };
}

async function openVerification(page: Page, opts: Setup = {}) {
  const otpCalls: Request[] = [];
  const verifyCalls: Request[] = [];
  const contactInfo = opts.contactEmail === null ? {} : { email: opts.contactEmail ?? 'hello@harbour.example' };

  await page.route('**/pi-sdk.js', (route) => route.abort());
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: fakeSession.user }));
  for (const t of ['users', 'user_roles', 'conversations', 'messages', 'notifications']) {
    await page.route(`**/rest/v1/${t}*`, (route) => route.fulfill({ json: [] }));
  }
  await page.route('**/rest/v1/businesses*', (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.fulfill({ json: [] });
    // .single() for the contact details; the owner's list otherwise
    if ((req.headers()['accept'] ?? '').includes('vnd.pgrst.object')) {
      return route.fulfill({ json: { contact_info: contactInfo, contact_email_verified_for: null } });
    }
    return route.fulfill({ json: [BUSINESS] });
  });
  await page.route('**/functions/v1/verify-business', (route) => {
    verifyCalls.push(route.request());
    return route.fulfill({
      json: {
        success: true,
        results: [{
          id: BUSINESS.id,
          name: BUSINESS.business_name,
          verified: false,
          contactConfirmed: opts.contactConfirmed ?? false,
          reason: opts.reason === undefined ? 'Contact email not confirmed' : opts.reason,
          totalTransactions: 120,
          creditedTransactions: 80,
          uniqueWallets: 14,
        }],
      },
    });
  });
  await page.route('**/functions/v1/contact-otp', (route) => {
    otpCalls.push(route.request());
    const { action } = route.request().postDataJSON() as { action: string };
    const reply = (action === 'send' ? opts.send : opts.verify) ?? { status: 200, body: { success: true } };
    return route.fulfill({ status: reply.status, json: reply.body });
  });
  await page.addInitScript(
    ([mockKey, storageKey, user, session]) => {
      localStorage.setItem(mockKey as string, '1');
      localStorage.setItem(storageKey as string, JSON.stringify({ ...(user as object), lastAuthenticated: Date.now() }));
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    },
    [SANDBOX_MOCK_KEY, STORAGE_KEY, mockUser, fakeSession],
  );

  await page.goto('/communicon');
  await page.getByRole('button', { name: 'Check verification status' }).tap();
  await page.getByRole('button', { name: /Harbour Light Coffee/ }).tap();
  await expect(page.getByText('Verification Not Approved').last()).toBeVisible();
  // The card reveals its rows one by one
  await page.waitForTimeout(1_800);
  return { otpCalls, verifyCalls };
}

const contactRow = (page: Page) => page.getByText(/^Contact Information: /).locator('xpath=ancestor::div[contains(@class,"flex items-center gap-2")][1]');

async function openCodeDialog(page: Page) {
  await contactRow(page).getByRole('button').tap();
  await page.getByRole('button', { name: 'Confirm', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function sendAndEnterCode(page: Page) {
  await page.getByRole('button', { name: 'Send Verification Code' }).tap();
  await expect(page.getByText(/Enter the 6-digit code/)).toBeVisible();
  await page.getByRole('dialog').locator('input').first().focus();
  await page.keyboard.type('123456');
  await page.getByRole('button', { name: 'Confirm Code' }).tap();
}

test('the card follows verify-business: unconfirmed contact and its reason', async ({ page }) => {
  const { verifyCalls } = await openVerification(page);
  await expect(page.getByText('Contact Information: unconfirmed')).toBeVisible();
  await expect(page.locator('[data-verification-reason]')).toHaveText('Contact email not confirmed');
  expect(verifyCalls[0]!.headers()['apikey']).toMatch(/^sb_publishable_/);
});

test('a confirmed code turns the Contact information line green', async ({ page }) => {
  const { otpCalls } = await openVerification(page);
  await openCodeDialog(page);
  await sendAndEnterCode(page);
  // The card closes the dialog once the code is confirmed
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Contact Information: confirmed')).toBeVisible();
  await expect(contactRow(page).locator('svg.text-primary')).toBeVisible();

  // The code went to the business's contact email, with the publishable key and the user's token
  expect(otpCalls.map((r) => (r.postDataJSON() as { action: string; email: string }).action)).toEqual(['send', 'verify']);
  for (const call of otpCalls) {
    expect((call.postDataJSON() as { email: string }).email).toBe('hello@harbour.example');
    expect(call.headers()['apikey']).toMatch(/^sb_publishable_/);
    expect(call.headers()['authorization']).toBe(`Bearer ${fakeSession.access_token}`);
  }
});

const SEND_ERRORS: [string, number, string][] = [
  ['cooldown', 429, 'Please wait a minute before requesting another code.'],
  ['email_failed', 500, "We couldn't send the email right now. Please try again later."],
  ['not_contact_email', 400, "This isn't the business's contact email."],
  ['something_new', 500, 'Something went wrong. Please try again.'],
];
for (const [code, status, message] of SEND_ERRORS) {
  test(`sending: ${code} shows "${message}"`, async ({ page }) => {
    await openVerification(page, { send: { status, body: { error: 'x', error_code: code } } });
    await openCodeDialog(page);
    await page.getByRole('button', { name: 'Send Verification Code' }).tap();
    await expect(page.getByRole('dialog').getByText(message)).toBeVisible();
  });
}

const VERIFY_ERRORS: [string, number, string][] = [
  ['invalid', 400, 'Incorrect code. Please try again.'],
  ['expired', 400, 'That code has expired. Request a new one.'],
  ['too_many_attempts', 429, 'Too many attempts. Request a new code.'],
];
for (const [code, status, message] of VERIFY_ERRORS) {
  test(`confirming: ${code} shows "${message}"`, async ({ page }) => {
    await openVerification(page, { verify: { status, body: { error: 'x', error_code: code } } });
    await openCodeDialog(page);
    await sendAndEnterCode(page);
    await expect(page.getByRole('dialog').getByText(message)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText('Contact Information: unconfirmed')).toBeVisible();
  });
}

test('no contact email: asks for one first, no Confirm button', async ({ page }) => {
  await openVerification(page, { contactEmail: null, reason: 'Add and confirm a contact email' });
  await contactRow(page).getByRole('button').tap();
  await expect(page.getByText('Add a contact email to your business first.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Your businesses' })).toHaveAttribute('href', '/registered-business');
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-verification-reason]')).toHaveText('Add and confirm a contact email');
});
