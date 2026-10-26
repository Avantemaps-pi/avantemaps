/**
 * CommuniCon fills the screen: the input sits at the bottom, the messages take
 * the space between the header and the input, and only the message list
 * scrolls (never the page).
 *
 * Bot replies (chat-ai) and the Messages data (conversations, messages) are
 * mocked. The sandbox mock session (honoured on localhost only) signs in, as
 * in keyboard-open.spec.ts.
 */
import { test, expect, type Page } from '@playwright/test';

const SANDBOX_MOCK_KEY = 'avante_sandbox_mock_session';
const STORAGE_KEY = 'avante_maps_auth';
const UID = '00000000-0000-0000-0000-000000000001';

// Mirrors the loginAsSandbox() fallback user in AuthProvider.tsx.
const mockUser = {
  uid: UID,
  pi_uid: 'sandbox-mock-pi-uid',
  username: 'SandboxUser',
  walletAddress: 'sandbox-mock-wallet',
  roles: ['user'],
  accessToken: 'sandbox-mock-token',
  subscriptionTier: 'organization',
  businessCount: 0,
};

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();
const conversations = Array.from({ length: 14 }, (_, i) => ({
  id: `conv-${i + 1}`,
  business_id: 9300 + i,
  customer_id: UID,
  last_message_at: iso(i * 30),
  last_message_preview: `Thanks, see you on ${['Monday', 'Tuesday', 'Friday'][i % 3]}!`,
  customer_unread: i === 0 ? 2 : 0,
  business_unread: 0,
  created_at: iso(5000),
  businesses: { business_name: `Test Business ${i + 1}`, images: [] },
}));
const thread = Array.from({ length: 24 }, (_, i) => ({
  id: `msg-${i + 1}`,
  conversation_id: 'conv-1',
  sender_id: i % 2 ? 'business-owner-id' : UID,
  sender_role: i % 2 ? 'business' : 'customer',
  body: i % 2 ? `Reply ${i + 1}: yes, we accept Pi for that.` : `Question ${i + 1}: do you accept Pi for orders?`,
  read_at: iso(1),
  created_at: iso(240 - i * 10),
}));

const SIZES = [
  { width: 375, height: 812 },
  { width: 375, height: 667 },
];

async function setup(page: Page) {
  await page.route('**/pi-sdk.js', (route) => route.abort());
  await page.route('**/functions/v1/chat-ai', (route) =>
    route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ choices: [{ delta: { content: 'Here is what I found about your listing.' } }] })}\n\ndata: [DONE]\n\n`,
    }),
  );
  await page.route('**/rest/v1/conversations*', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: conversations }) : route.fulfill({ json: [] }),
  );
  await page.route('**/rest/v1/messages*', (route) =>
    route.request().method() === 'GET' ? route.fulfill({ json: thread }) : route.fulfill({ json: [] }),
  );
  await page.addInitScript(
    ([mockKey, storageKey, user]) => {
      localStorage.setItem(mockKey as string, '1');
      localStorage.setItem(storageKey as string, JSON.stringify({ ...(user as object), lastAuthenticated: Date.now() }));
    },
    [SANDBOX_MOCK_KEY, STORAGE_KEY, mockUser],
  );
  await page.goto('/communicon');
  await expect(page.getByRole('button', { name: 'Bot' })).toBeVisible();
  await page.waitForLoadState('networkidle');
}

const botInput = (page: Page) => page.getByPlaceholder('Ask about your business...');
const composer = (page: Page) => page.getByRole('textbox', { name: 'Message' });

// The page (document and <main>) never scrolls; only lists inside it do
async function expectPageDoesNotScroll(page: Page) {
  const r = await page.evaluate(() => {
    const se = document.scrollingElement!;
    const main = document.querySelector('main')!;
    window.scrollTo(0, 10_000);
    main.scrollTop = 10_000;
    return {
      docOverflow: se.scrollHeight - se.clientHeight,
      mainOverflow: main.scrollHeight - main.clientHeight,
      docScrollTop: se.scrollTop,
      mainScrollTop: main.scrollTop,
    };
  });
  expect(r).toEqual({ docOverflow: 0, mainOverflow: 0, docScrollTop: 0, mainScrollTop: 0 });
}

// The list is scrolled all the way down, i.e. pinned to its newest message
async function expectPinnedToNewest(page: Page, list: ReturnType<Page['locator']>) {
  await expect
    .poll(() => list.evaluate((el) => Math.round(el.scrollHeight - el.scrollTop - el.clientHeight)))
    .toBeLessThanOrEqual(2);
}

async function bottomGap(page: Page, selector: ReturnType<Page['locator']>) {
  const box = (await selector.boundingBox())!;
  return page.viewportSize()!.height - (box.y + box.height);
}

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size, hasTouch: true, isMobile: true });

    test('Bot, welcome only: input at the bottom, page does not scroll', async ({ page }) => {
      await setup(page);
      const gap = await bottomGap(page, botInput(page));
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(32);
      await expectPageDoesNotScroll(page);
    });

    test('Bot, long conversation: only the message list scrolls, newest in view', async ({ page }) => {
      await setup(page);
      for (let i = 1; i <= 8; i++) {
        await botInput(page).fill(`Test message number ${i} about my listing`);
        await botInput(page).press('Enter');
        await expect(page.getByText(`Test message number ${i} about my listing`)).toBeVisible();
      }
      await page.waitForTimeout(800);
      const list = page.locator('main .overflow-y-auto').first();
      expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      expect(await bottomGap(page, botInput(page))).toBeLessThanOrEqual(32);
      await expectPageDoesNotScroll(page);
      await expect(page.getByText('Test message number 8 about my listing')).toBeInViewport();
    });

    test('Messages inbox: the list reaches the bottom of the screen and scrolls on its own', async ({ page }) => {
      await setup(page);
      await page.getByRole('button', { name: 'Messages' }).click();
      await expect(page.getByText('Test Business 14')).toBeAttached();
      const list = page.locator('main ul').first().locator('xpath=..');
      expect(await bottomGap(page, list)).toBeLessThanOrEqual(32);
      expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await expectPageDoesNotScroll(page);
    });

    test('open conversation: composer at the bottom, only the thread scrolls', async ({ page }) => {
      await setup(page);
      await page.getByRole('button', { name: 'Messages' }).click();
      await page.getByText('Test Business 1', { exact: true }).click();
      await expect(composer(page)).toBeVisible();
      await expect(page.getByText('Reply 24: yes, we accept Pi for that.')).toBeAttached();
      const gap = await bottomGap(page, composer(page));
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(32);
      const threadList = page.locator('main .overflow-y-auto').last();
      expect(await threadList.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await expectPageDoesNotScroll(page);
    });

    test('keyboard open (viewport shrinks): input stays just above it, newest message in view', async ({ page }) => {
      // ~300px keyboard
      await setup(page);
      for (let i = 1; i <= 6; i++) {
        await botInput(page).fill(`Keyboard test ${i}`);
        await botInput(page).press('Enter');
        await expect(page.getByText(`Keyboard test ${i}`)).toBeVisible();
      }
      await botInput(page).focus();
      await page.setViewportSize({ width: size.width, height: size.height - 300 });
      await page.waitForTimeout(500);
      const gap = await bottomGap(page, botInput(page));
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(32);
      await expect(botInput(page)).toBeFocused();
      const list = page.locator('main .overflow-y-auto').first();
      await expectPinnedToNewest(page, list);
      // The newest message (the bot's reply to "Keyboard test 6") is on screen
      await expect(list.getByText('Here is what I found about your listing.').last()).toBeInViewport();
      await expectPageDoesNotScroll(page);
    });

    // The thread stays pinned to the newest message. At 375x667 with a ~300px keyboard
    // the stacked headers leave the thread only ~44px tall (header design is out of
    // scope), so this asserts the pinning rather than the bubble being on screen.
    test('keyboard open in a conversation: composer stays above it, thread pinned to the newest message', async ({ page }) => {
      await setup(page);
      await page.getByRole('button', { name: 'Messages' }).click();
      await page.getByText('Test Business 1', { exact: true }).click();
      await expect(page.getByText('Reply 24: yes, we accept Pi for that.')).toBeInViewport();
      await page.waitForTimeout(800);
      await composer(page).focus();
      await page.setViewportSize({ width: size.width, height: size.height - 300 });
      await page.waitForTimeout(500);
      const gap = await bottomGap(page, composer(page));
      expect(gap).toBeGreaterThanOrEqual(0);
      expect(gap).toBeLessThanOrEqual(32);
      await expectPinnedToNewest(page, page.locator('main .overflow-y-auto').last());
      await expectPageDoesNotScroll(page);
    });
  });
}
