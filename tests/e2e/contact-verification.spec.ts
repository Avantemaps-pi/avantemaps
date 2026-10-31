/**
 * CommuniCon's business verification: the Contact information check follows
 * the server (verify-business's contactConfirmed and reason), the code only
 * goes to the business's contact email, and each contact-otp error_code gets
 * its own message.
 *
 * A sent code survives a reload (the Pi Browser reloads when the owner switches
 * to their email app): it's remembered for 15 minutes and its entry reopens
 * without sending again.
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
  /** Wallet figures from verify-business (default: 13 transactions, 4 received, 9 wallets) */
  counts?: { totalTransactions: number; creditedTransactions: number; uniqueWallets: number };
  /** Per-call overrides of verify-business's result (index 0 = first call) */
  verifyReplies?: Record<string, unknown>[];
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
    const override = opts.verifyReplies?.[verifyCalls.length - 1] ?? {};
    return route.fulfill({
      json: {
        success: true,
        results: [{
          id: BUSINESS.id,
          name: BUSINESS.business_name,
          verified: false,
          contactConfirmed: opts.contactConfirmed ?? false,
          reason: opts.reason === undefined ? 'Contact email not confirmed' : opts.reason,
          ...(opts.counts ?? { totalTransactions: 13, creditedTransactions: 4, uniqueWallets: 9 }),
          ...override,
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
  await expect(card(page).getByRole('heading', { name: 'Not verified yet' })).toBeVisible();
  // The card reveals its rows one by one
  await page.waitForTimeout(1_800);
  return { otpCalls, verifyCalls };
}

// The latest result card
const card = (page: Page) => page.getByRole('region', { name: 'Verification progress for Harbour Light Coffee' }).last();
const progressLine = (page: Page) => card(page).locator('[data-verification-progress]');

async function openCodeDialog(page: Page) {
  await card(page).getByRole('button', { name: 'Confirm', exact: true }).tap();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function sendCode(page: Page) {
  await page.getByRole('button', { name: 'Send Verification Code' }).tap();
  await expect(page.getByText(/Enter the 6-digit code/)).toBeVisible();
}

// The 6th digit submits the code by itself
async function enterCode(page: Page, code = '123456') {
  await page.getByRole('dialog').locator('input').first().focus();
  await page.keyboard.type(code);
}

async function sendAndEnterCode(page: Page) {
  await sendCode(page);
  await enterCode(page);
}

const PENDING_KEY = 'avante:pending-contact-code';
const pendingCode = (page: Page) => page.evaluate((key) => localStorage.getItem(key), PENDING_KEY);
const banner = (page: Page) => page.locator('[data-pending-code-banner]');

test('the card shows progress: rows, counts, bars, masked email; no reason text', async ({ page }) => {
  const { verifyCalls } = await openVerification(page);
  const c = card(page);
  await expect(progressLine(page)).toHaveText('Harbour Light Coffee · 0 of 3 done');
  await expect(c.getByText('Not confirmed', { exact: true })).toBeVisible();
  await expect(c.getByText('he•••@harbour.example')).toBeVisible();
  await expect(c.getByText('13 of 100')).toBeVisible();
  await expect(c.getByText('Received: 4 of 50')).toBeVisible();
  await expect(c.getByText('9 of 10')).toBeVisible();
  await expect(c.getByText('1 more to go')).toBeVisible();
  await expect(c.getByRole('progressbar', { name: 'Transactions' })).toHaveAttribute('aria-valuenow', '13');
  await expect(c.getByRole('progressbar', { name: 'Wallets traded with' })).toHaveAttribute('aria-valuenow', '9');
  // The server's reason string is never printed
  await expect(page.getByText('Contact email not confirmed')).toHaveCount(0);
  await expect(page.locator('[data-verification-reason]')).toHaveCount(0);
  // No "not approved" bubble: the card is the message; the toast is neutral
  await expect(page.getByText(/was not approved/)).toHaveCount(0);
  await expect(page.getByText("0 of 3 done. Check the card for what's left.")).toBeVisible();
  expect(verifyCalls[0]!.headers()['apikey']).toMatch(/^sb_publishable_/);
});

test('nothing in the card is red', async ({ page }) => {
  await openVerification(page);
  await expect(card(page).locator('[class*="destructive"]')).toHaveCount(0);
});

test('"Check again" re-runs verify-business for the same business, without the picker', async ({ page }) => {
  const { verifyCalls } = await openVerification(page);
  await card(page).getByRole('button', { name: 'Check again' }).tap();
  await expect.poll(() => verifyCalls.length).toBe(2);
  expect(verifyCalls.map((r) => (r.postDataJSON() as { business_id: number }).business_id)).toEqual([BUSINESS.id, BUSINESS.id]);
  await expect(page.getByText('Select your business:')).toHaveCount(1);
  await expect(page.getByRole('region', { name: 'Verification progress for Harbour Light Coffee' })).toHaveCount(2);
});

test('confirming the code: the row turns Confirmed, the count goes up by one, no stale reason', async ({ page }) => {
  const { otpCalls } = await openVerification(page);
  await openCodeDialog(page);
  await sendAndEnterCode(page);
  // The card closes the dialog once the code is confirmed
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(card(page).getByText('Confirmed', { exact: true })).toBeVisible();
  // The count goes up by one, and nothing still says the email isn't confirmed
  await expect(progressLine(page)).toHaveText('Harbour Light Coffee · 1 of 3 done');
  await expect(page.getByText('Contact email not confirmed')).toHaveCount(0);
  await expect(card(page).getByText('Not confirmed', { exact: true })).toHaveCount(0);
  await expect(card(page).getByText('Your contact email stays confirmed unless you change it.', { exact: false })).toBeVisible();

  // The code went to the business's contact email, with the publishable key and the user's token
  expect(otpCalls.map((r) => (r.postDataJSON() as { action: string; email: string }).action)).toEqual(['send', 'verify']);
  for (const call of otpCalls) {
    expect((call.postDataJSON() as { email: string }).email).toBe('hello@harbour.example');
    expect(call.headers()['apikey']).toMatch(/^sb_publishable_/);
    expect(call.headers()['authorization']).toBe(`Bearer ${fakeSession.access_token}`);
  }
});

test('confirming the last missing check runs verification again by itself: the new card says Verified', async ({ page }) => {
  const { verifyCalls } = await openVerification(page, {
    // Everything met except the contact email; once confirmed, the server says Verified
    counts: { totalTransactions: 120, creditedTransactions: 80, uniqueWallets: 14 },
    verifyReplies: [{}, { verified: true, contactConfirmed: true, reason: null }],
  });
  await expect(progressLine(page)).toHaveText('Harbour Light Coffee · 2 of 3 done');
  await openCodeDialog(page);
  await sendAndEnterCode(page);

  // No button tap: the card checks again for the same business
  await expect.poll(() => verifyCalls.length).toBe(2);
  expect((verifyCalls[1]!.postDataJSON() as { business_id: number }).business_id).toBe(BUSINESS.id);
  await expect(card(page).getByRole('heading', { name: 'Verified' })).toBeVisible();

  // The first card, all done but not verified by its own result, never says "Not verified yet"
  await expect(page.getByRole('heading', { name: 'Not verified yet' })).toHaveCount(0);
  const first = page.getByRole('region', { name: 'Verification progress for Harbour Light Coffee' }).first();
  await expect(first.getByRole('heading', { name: 'Ready to verify' })).toBeVisible();
  await expect(first.getByText('Harbour Light Coffee · All done')).toBeVisible();
  await expect(first.getByText("Everything's done. Tap Check again to get verified.")).toBeVisible();
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
    await expect(card(page).getByText('Not confirmed', { exact: true })).toBeVisible();
  });
}

test('no contact email: asks for one first, no Confirm button', async ({ page }) => {
  await openVerification(page, { contactEmail: null, reason: 'Add and confirm a contact email' });
  await expect(card(page).getByText('Add a contact email to your business first.')).toBeVisible();
  await expect(card(page).getByRole('link', { name: 'Your businesses' })).toHaveAttribute('href', '/registered-business');
  await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toHaveCount(0);
  await expect(page.getByText('Add and confirm a contact email')).toHaveCount(0);
});

test('the code entry: numeric keypad, one-time-code autofill, a tip about the subject line', async ({ page }) => {
  await openVerification(page);
  await openCodeDialog(page);
  await sendCode(page);
  const input = page.getByRole('dialog').locator('input').first();
  await expect(input).toHaveAttribute('inputmode', 'numeric');
  await expect(input).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(page.getByRole('dialog').getByText("Tip: the code is in the email's subject.", { exact: false })).toBeVisible();
});

test('after a reload the code entry reopens by itself, with no second send, and confirms', async ({ page }) => {
  const { otpCalls } = await openVerification(page);
  await openCodeDialog(page);
  await sendCode(page);
  const stored = JSON.parse((await pendingCode(page))!) as Record<string, unknown>;
  expect(stored).toMatchObject({ businessId: BUSINESS.id, email: 'hello@harbour.example', businessName: BUSINESS.business_name });
  expect(typeof stored.sentAt).toBe('number');

  // The Pi Browser reloads while the owner is in their email app
  await page.reload();
  await expect(page.getByRole('dialog').getByText(/Enter the 6-digit code/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send Verification Code' })).toHaveCount(0);
  await expect(banner(page)).toContainText('Finish confirming your email');
  await enterCode(page);

  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(otpCalls.map((r) => (r.postDataJSON() as { action: string }).action)).toEqual(['send', 'verify']);
  // The stored card turns Confirmed, and the reminder is gone
  await expect(card(page).getByText('Confirmed', { exact: true })).toBeVisible();
  await expect(progressLine(page)).toHaveText('Harbour Light Coffee · 1 of 3 done');
  await expect(banner(page)).toHaveCount(0);
  expect(await pendingCode(page)).toBeNull();
});

test('resumed after a reload and it was the last check: verification runs again by itself', async ({ page }) => {
  const { verifyCalls } = await openVerification(page, {
    counts: { totalTransactions: 120, creditedTransactions: 80, uniqueWallets: 14 },
    verifyReplies: [{}, { verified: true, contactConfirmed: true, reason: null }],
  });
  await openCodeDialog(page);
  await sendCode(page);
  await page.reload();
  await enterCode(page);
  await expect.poll(() => verifyCalls.length).toBe(2);
  expect((verifyCalls[1]!.postDataJSON() as { business_id: number }).business_id).toBe(BUSINESS.id);
  await expect(card(page).getByRole('heading', { name: 'Verified' })).toBeVisible();
});

test('the banner on another page leads back to the code entry', async ({ page }) => {
  const { otpCalls } = await openVerification(page);
  await openCodeDialog(page);
  await sendCode(page);
  await page.keyboard.press('Escape');
  await page.goto('/settings');
  await expect(banner(page)).toContainText('Finish confirming your email · Enter code');
  await banner(page).getByRole('button', { name: 'Enter code' }).tap();
  await page.waitForURL('**/communicon');
  await expect(page.getByRole('dialog').getByText(/Enter the 6-digit code/)).toBeVisible();
  expect(otpCalls).toHaveLength(1);
});

test('a code sent 16 minutes ago is forgotten: no banner, no code entry, back to sending', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({ businessId: 9001, email: 'hello@harbour.example', businessName: 'Harbour Light Coffee', sentAt: Date.now() - 16 * 60 * 1000 }),
    );
  }, PENDING_KEY);
  await openVerification(page);
  await expect(banner(page)).toHaveCount(0);
  expect(await pendingCode(page)).toBeNull();
  await openCodeDialog(page);
  await expect(page.getByRole('button', { name: 'Send Verification Code' })).toBeVisible();
});

test('pasting "482 913" keeps the digits and submits 482913', async ({ page }) => {
  const { otpCalls } = await openVerification(page);
  await openCodeDialog(page);
  await sendCode(page);
  // Into the boxes (long-press, Paste)
  await page.getByRole('dialog').locator('input').first().evaluate((input) => {
    const data = new DataTransfer();
    data.setData('text/plain', '482 913');
    input.focus();
    input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await expect.poll(() => otpCalls.length).toBe(2);
  expect((otpCalls[1]!.postDataJSON() as { otp: string }).otp).toBe('482913');
});

test('the Paste button reads "482 913" from the clipboard and submits 482913', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const { otpCalls } = await openVerification(page, { verify: { status: 400, body: { error: 'x', error_code: 'invalid' } } });
  await openCodeDialog(page);
  await sendCode(page);
  await page.evaluate(() => navigator.clipboard.writeText('482 913'));
  await page.getByRole('dialog').getByRole('button', { name: 'Paste' }).tap();
  await expect.poll(() => otpCalls.length).toBe(2);
  expect((otpCalls[1]!.postDataJSON() as { otp: string }).otp).toBe('482913');
  // A wrong code keeps the pending code (it can still be resumed)
  await expect(page.getByRole('dialog').getByText('Incorrect code. Please try again.')).toBeVisible();
  expect(await pendingCode(page)).not.toBeNull();
});

test('an expired code clears the pending code', async ({ page }) => {
  await openVerification(page, { verify: { status: 400, body: { error: 'x', error_code: 'expired' } } });
  await openCodeDialog(page);
  await sendAndEnterCode(page);
  await expect(page.getByRole('dialog').getByText('That code has expired. Request a new one.')).toBeVisible();
  expect(await pendingCode(page)).toBeNull();
});
