/**
 * Map card strip: a pin tap shows a swipeable strip of the businesses in view
 * (tapped one first) instead of opening the drawer; tapping a card opens the
 * drawer, and closing it returns to the strip.
 *
 * Touch input at 375x812. The business list is mocked through the
 * get_public_business_info RPC, the sandbox mock session signs in (localhost
 * only), as in place-drawer.spec.ts. The map is moved to zoom 17, where pins
 * stop clustering, so every business has its own pin.
 */
import { test, expect, type Page, type Locator } from '@playwright/test';

const SANDBOX_MOCK_KEY = 'avante_sandbox_mock_session';
const STORAGE_KEY = 'avante_maps_auth';

// Mirrors the loginAsSandbox() fallback user in AuthProvider.tsx.
const mockUser = {
  uid: '00000000-0000-0000-0000-000000000001',
  pi_uid: 'sandbox-mock-pi-uid',
  username: 'SandboxUser',
  walletAddress: 'sandbox-mock-wallet',
  roles: ['user'],
  accessToken: 'sandbox-mock-token',
  subscriptionTier: 'organization',
  businessCount: 0,
};

const photo = (n: number) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#1E3A8A"/><text x="200" y="215" font-size="48" fill="#fff" text-anchor="middle">${n}</text></svg>`,
  );
const open = (o: string, c: string) => ({ open: o, close: c, closed: false });
const everyDay = (value: object) =>
  Object.fromEntries(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => [d, value]));

const base = {
  keywords: [],
  contact_info: {},
  hours: null,
  images: [],
  city: 'Cape Town',
  country: 'South Africa',
  is_verified: false,
  is_certified: false,
  verification_status: null,
  description: '',
};

const CENTRE = { lat: -33.92, lng: 18.4212 };
// Within ~150m of the centre, so all six are in view at zoom 17
const BUSINESSES = [
  { ...base, id: 9501, name: 'Harbour Light Coffee', category: 'Coffee Shop', business_types: ['Food'], latitude: -33.92, longitude: 18.421, images: [photo(1)], hours: everyDay(open('07:00', '17:00')), is_verified: true },
  { ...base, id: 9502, name: 'Table Bay Bookshop', category: 'Retail', business_types: ['Retail'], latitude: -33.9188, longitude: 18.4222, images: [photo(2)], is_certified: true, is_verified: true },
  { ...base, id: 9503, name: 'Mzansi Mobile Repairs', category: 'Services', business_types: ['Services'], latitude: -33.9212, longitude: 18.4199 },
  { ...base, id: 9504, name: 'Sea Point Bakery', category: 'Food', business_types: ['Food'], latitude: -33.9176, longitude: 18.4204, images: [photo(4)] },
  { ...base, id: 9505, name: 'Kloof Street Florist', category: 'Retail', business_types: ['Retail'], latitude: -33.9224, longitude: 18.4218, images: [photo(5)] },
  { ...base, id: 9506, name: 'Long Street Records', category: 'Entertainment', business_types: ['Entertainment'], latitude: -33.9206, longitude: 18.4228, images: [photo(6)] },
];
const NO_PHOTO = BUSINESSES[2]!; // no photo, no hours, no reviews

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

const strip = (page: Page) => page.getByRole('region', { name: 'Businesses in this area' });
const card = (page: Page, name: string) => page.locator('[data-strip-card]').filter({ has: page.getByRole('button', { name: new RegExp(`^${name}`) }) });
const pin = (page: Page, name: string) => page.locator(`img.leaflet-marker-icon[alt="${name}"]`);

async function openMap(page: Page, rows: typeof BUSINESSES = BUSINESSES) {
  await page.route('**/pi-sdk.js', (route) => route.abort());
  await page.route('**/rest/v1/rpc/get_public_business_info*', (route) => route.fulfill({ json: rows }));
  await page.route('https://ipwho.is/**', (route) =>
    route.fulfill({ json: { success: true, latitude: CENTRE.lat, longitude: CENTRE.lng } }),
  );
  // Map clicks reverse-geocode for the country focus; answer "no country"
  await page.route('https://nominatim.openstreetmap.org/**', (route) => route.fulfill({ json: {} }));
  await page.addInitScript(
    ([mockKey, storageKey, user]) => {
      localStorage.setItem(mockKey as string, '1');
      localStorage.setItem(storageKey as string, JSON.stringify({ ...(user as object), lastAuthenticated: Date.now() }));
      localStorage.setItem('location_banner_seen', '1');
    },
    [SANDBOX_MOCK_KEY, STORAGE_KEY, mockUser],
  );
  await page.goto('/');
  await expect(page.locator('.leaflet-marker-icon').first()).toBeAttached();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_000);
  await page.evaluate(
    (c) => window.dispatchEvent(new CustomEvent('centerMap', { detail: { lat: c.lat, lng: c.lng, zoom: 17 } })),
    CENTRE,
  );
  for (const b of rows.slice(0, 6)) await expect(pin(page, b.name)).toBeVisible();
  await page.waitForTimeout(800);
}

async function tapCentre(page: Page, locator: Locator) {
  const box = (await locator.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
}

async function tapPin(page: Page, name: string) {
  await tapCentre(page, pin(page, name));
  await expect(strip(page)).toBeVisible();
  await page.waitForTimeout(500);
}

const pinSize = (page: Page, name: string) => pin(page, name).evaluate((el) => Math.round(el.getBoundingClientRect().width));
const selectedName = (page: Page) =>
  page.locator('[data-strip-card][aria-current="true"] button[aria-label]').first().getAttribute('aria-label');

// Horizontal touch drag across the strip
async function swipeStrip(page: Page, dx: number) {
  const box = (await strip(page).boundingBox())!;
  const y = box.y + box.height / 2;
  const x0 = dx < 0 ? box.x + box.width - 40 : box.x + 40;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (dx * i) / 10, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(900);
}

test('tapping a pin shows the strip, not the drawer; tapped business first, its pin active', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const first = page.locator('[data-strip-card]').first().getByRole('button', { name: /^Table Bay Bookshop/ });
  await expect(first).toBeAttached();
  expect(await selectedName(page)).toMatch(/^Table Bay Bookshop/);
  expect(await pinSize(page, 'Table Bay Bookshop')).toBe(48);
  expect(await pinSize(page, 'Harbour Light Coffee')).toBe(40);
  await expect(page.locator('[data-strip-card]')).toHaveCount(BUSINESSES.length);
  await expect(strip(page).locator('[aria-live]')).toHaveText(`Table Bay Bookshop, 1 of ${BUSINESSES.length}`);
});

test('swiping to the next card selects it and makes its pin active', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  const second = await page.locator('[data-strip-card]').nth(1).getAttribute('data-strip-card');
  const secondName = BUSINESSES.find((b) => String(b.id) === second)!.name;
  await swipeStrip(page, -260);
  await expect.poll(() => selectedName(page)).toMatch(new RegExp(`^${secondName}`));
  await expect.poll(() => pinSize(page, secondName)).toBe(48);
  expect(await pinSize(page, 'Table Bay Bookshop')).toBe(40);
});

test('arrow keys move between cards', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  await page.locator('[data-strip-card]').first().getByRole('button').first().focus();
  await page.keyboard.press('ArrowRight');
  const second = await page.locator('[data-strip-card]').nth(1).getAttribute('data-strip-card');
  const secondName = BUSINESSES.find((b) => String(b.id) === second)!.name;
  await expect.poll(() => selectedName(page)).toMatch(new RegExp(`^${secondName}`));
});

test('tapping a card opens the drawer; closing it returns to the strip with the same card', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  await tapCentre(page, card(page, 'Table Bay Bookshop').locator('p').first());
  const drawer = page.getByRole('dialog');
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('heading', { name: /Table Bay Bookshop/ })).toBeVisible();
  await drawer.getByRole('button', { name: 'Close' }).first().tap();
  await expect(drawer).toHaveCount(0);
  await expect(strip(page)).toBeVisible();
  expect(await selectedName(page)).toMatch(/^Table Bay Bookshop/);
});

test('tapping empty map closes the strip and the + button comes back', async ({ page }) => {
  await openMap(page);
  const fab = page.locator('[data-add-business-button]');
  await tapPin(page, 'Table Bay Bookshop');
  await expect(fab).toHaveCSS('opacity', '0');
  await expect(fab).toHaveAttribute('inert', '');
  // A spot on the map clear of pins and controls
  await page.touchscreen.tap(60, 330);
  await expect(strip(page)).toHaveCount(0);
  await expect(fab).toHaveCSS('opacity', '1');
  await expect(fab).not.toHaveAttribute('inert', '');
});

test('while the strip is open, Locate, zoom and the OSM credit clear the strip and each other', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  await page.waitForTimeout(500);
  const boxes = {
    strip: (await page.locator('[data-strip-card]').first().boundingBox())!,
    locate: (await page.locator('button[aria-label="Show my location"]').boundingBox())!,
    zoom: (await page.locator('div:has(> div > button[aria-label="Zoom in"])').boundingBox())!,
    osm: (await page.locator('.leaflet-control-attribution').boundingBox())!,
  };
  const overlap = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const names = Object.keys(boxes) as Array<keyof typeof boxes>;
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++)
      expect(overlap(boxes[names[i]!], boxes[names[j]!]), `${names[i]} overlaps ${names[j]}`).toBe(false);
  // 12px gaps above the strip
  expect(Math.round(boxes.strip.y - (boxes.zoom.y + boxes.zoom.height))).toBeGreaterThanOrEqual(12);
  expect(Math.round(boxes.strip.y - (boxes.osm.y + boxes.osm.height))).toBeGreaterThanOrEqual(12);
  expect(Math.round(boxes.zoom.y - (boxes.locate.y + boxes.locate.height))).toBeGreaterThanOrEqual(12);
});

test('search autocomplete still opens the drawer directly', async ({ page }) => {
  await openMap(page);
  const search = page.locator('input[aria-label="Search businesses"]');
  await search.tap();
  await search.pressSequentially('Kloof', { delay: 40 });
  // The pin is also a button named after the business: pick the suggestion itself
  const suggestion = page.locator('[data-search-bar] button', { hasText: 'Kloof Street Florist' });
  await expect(suggestion).toBeVisible();
  await suggestion.tap();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(strip(page)).toHaveCount(0);
});

test('a category change closes the strip', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  await page.getByRole('tab', { name: /Food/ }).tap();
  await expect(strip(page)).toHaveCount(0);
});

test('a business with no photo, no hours and no reviews renders cleanly', async ({ page }) => {
  await openMap(page);
  await tapPin(page, NO_PHOTO.name);
  const c = card(page, NO_PHOTO.name);
  await expect(c.locator('img')).toHaveCount(0);
  await expect(c.locator('svg.lucide-store')).toBeVisible();
  await expect(c.getByText('No reviews yet')).toBeVisible();
  await expect(c.getByText('Services', { exact: true })).toBeVisible();
  await expect(c.getByRole('button', { name: `${NO_PHOTO.name}, Services` })).toBeAttached();
  const box = (await c.boundingBox())!;
  expect(Math.round(box.height)).toBe(124);
});

const order = (page: Page) => page.locator('[data-strip-card]').evaluateAll((els) => els.map((e) => e.getAttribute('data-strip-card')));

test('swiping (and the map panning it causes) does not reorder the list', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  const before = await order(page);
  await swipeStrip(page, -260);
  await swipeStrip(page, -260);
  expect(await order(page)).toEqual(before);
});

test('a user drag rebuilds the list but keeps the selected card while it is in view', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  const cdp = await page.context().newCDPSession(page);
  // Small drag on empty map
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 360 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120 + i * 5, y: 360 + i * 3 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(800);
  await expect(strip(page)).toBeVisible();
  expect(await selectedName(page)).toMatch(/^Table Bay Bookshop/);
});

test('Escape closes the strip', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  await page.keyboard.press('Escape');
  await expect(strip(page)).toHaveCount(0);
});

test('the on-screen keyboard hides the strip without closing it', async ({ page }) => {
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  await page.locator('input[aria-label="Search businesses"]').focus();
  await page.setViewportSize({ width: 375, height: 450 });
  const region = page.locator('[data-map-strip]');
  await expect(region).toHaveCSS('opacity', '0');
  await expect(region).toHaveAttribute('inert', '');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(region).toHaveCSS('opacity', '1');
});

test('one business in view: a strip with a single card', async ({ page }) => {
  await openMap(page, [BUSINESSES[0]!]);
  await tapPin(page, BUSINESSES[0]!.name);
  await expect(page.locator('[data-strip-card]')).toHaveCount(1);
  await expect(strip(page).locator('[aria-live]')).toHaveText(`${BUSINESSES[0]!.name}, 1 of 1`);
});

test('more than 20 in view: the strip caps at 20, tapped business first', async ({ page }) => {
  // 25 businesses on a tight 5x5 grid around the centre
  const many = Array.from({ length: 25 }, (_, i) => ({
    ...base,
    id: 9600 + i,
    name: `Grid Shop ${i + 1}`,
    category: 'Retail',
    business_types: ['Retail'],
    latitude: CENTRE.lat - 0.0016 + Math.floor(i / 5) * 0.0008,
    longitude: CENTRE.lng - 0.0012 + (i % 5) * 0.0006,
  })) as unknown as typeof BUSINESSES;
  await openMap(page, many);
  await tapPin(page, 'Grid Shop 13');
  await expect(page.locator('[data-strip-card]')).toHaveCount(20);
  expect(await selectedName(page)).toMatch(/^Grid Shop 13/);
  expect((await order(page))[0]).toBe('9612');
});

test('empty-map tap with the strip open only closes it: no country lookup, the map stays put', async ({ page }) => {
  const nominatim: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('nominatim.openstreetmap.org')) nominatim.push(r.url());
  });
  await openMap(page);
  await tapPin(page, 'Table Bay Bookshop');
  // The map pans to the selected pin after a pin tap; measure once it has settled
  await page.waitForTimeout(800);
  const pinBefore = (await pin(page, 'Harbour Light Coffee').boundingBox())!;

  await page.touchscreen.tap(60, 330);
  await expect(strip(page)).toHaveCount(0);
  await page.waitForTimeout(1_500);
  const pinAfter = (await pin(page, 'Harbour Light Coffee').boundingBox())!;
  // Same centre and zoom: the pin is where it was, at the same size
  expect(Math.abs(pinAfter.x - pinBefore.x)).toBeLessThanOrEqual(2);
  expect(Math.abs(pinAfter.y - pinBefore.y)).toBeLessThanOrEqual(2);
  expect(Math.round(pinAfter.width)).toBe(Math.round(pinBefore.width));
  expect(nominatim).toEqual([]);

  // Control: with the strip closed, the same tap still runs the country focus
  await page.touchscreen.tap(60, 330);
  await expect.poll(() => nominatim.length).toBeGreaterThan(0);
});

test('opening a strip of 20 cards makes at most one bookmarks request', async ({ page }) => {
  // A signed-in Supabase session (fake, unexpired) so bookmarks are really loaded
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const uid = mockUser.uid;
  const session = {
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: uid, exp, role: 'authenticated', aud: 'authenticated' })}.sig`,
    refresh_token: 'fake-refresh',
    expires_in: 3600,
    expires_at: exp,
    token_type: 'bearer',
    user: { id: uid, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
  };
  await page.route('**/auth/v1/**', (route) => route.fulfill({ json: session.user }));
  await page.route('**/rest/v1/bookmarks*', (route) => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/users*', (route) => route.fulfill({ json: [] }));
  await page.route('**/rest/v1/user_roles*', (route) => route.fulfill({ json: [] }));
  await page.addInitScript((s) => localStorage.setItem('supabase.auth.token', JSON.stringify(s)), session);

  const many = Array.from({ length: 24 }, (_, i) => ({
    ...base,
    id: 9700 + i,
    name: `Grid Shop ${i + 1}`,
    category: 'Retail',
    business_types: ['Retail'],
    latitude: CENTRE.lat - 0.0016 + Math.floor(i / 5) * 0.0008,
    longitude: CENTRE.lng - 0.0012 + (i % 5) * 0.0006,
  })) as unknown as typeof BUSINESSES;
  await openMap(page, many);

  const bookmarkRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/rest/v1/bookmarks')) bookmarkRequests.push(r.url());
  });
  await tapPin(page, 'Grid Shop 13');
  await expect(page.locator('[data-strip-card]')).toHaveCount(20);
  await page.waitForTimeout(1_500);
  console.log(`bookmarks requests: ${bookmarkRequests.length}`);
  // One fetch for the whole strip. The dev server runs React StrictMode (TanStack
  // Start's default client entry), which mounts components twice, so 1 shows up
  // as 2 here; with a hook per card it was 40 (20 x 2).
  expect(bookmarkRequests.length).toBeLessThanOrEqual(2);
});
