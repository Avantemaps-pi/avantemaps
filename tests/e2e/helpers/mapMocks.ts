/**
 * Shared setup for map specs: the sandbox mock session (honoured on localhost
 * only) and mocked business data, so the tests never depend on what's live in
 * Supabase.
 */
import { expect, type Page } from '@playwright/test';

export const SANDBOX_MOCK_KEY = 'avante_sandbox_mock_session';
export const STORAGE_KEY = 'avante_maps_auth';

// Mirrors the loginAsSandbox() fallback user in AuthProvider.tsx.
export const mockUser = {
  uid: '00000000-0000-0000-0000-000000000001',
  pi_uid: 'sandbox-mock-pi-uid',
  username: 'SandboxUser',
  walletAddress: 'sandbox-mock-wallet',
  roles: ['user'],
  accessToken: 'sandbox-mock-token',
  subscriptionTier: 'organization',
  businessCount: 0,
};

export const CENTRE = { lat: -33.92, lng: 18.4212 };

const row = {
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

// ~150m apart around CENTRE: one cluster at the start zoom, separate pins at zoom 17
export const NEARBY_BUSINESSES = [
  { ...row, id: 9601, name: 'Harbour Light Coffee', category: 'Coffee Shop', business_types: ['Food'], latitude: -33.92, longitude: 18.421 },
  { ...row, id: 9602, name: 'Table Bay Bookshop', category: 'Retail', business_types: ['Retail'], latitude: -33.9188, longitude: 18.4222 },
  { ...row, id: 9603, name: 'Mzansi Mobile Repairs', category: 'Services', business_types: ['Services'], latitude: -33.9212, longitude: 18.4199 },
];

/**
 * Mocks the map's outside calls (Pi SDK blocked, business list, IP location,
 * reverse geocoding) and signs in with the sandbox mock session. `storage`
 * adds extra localStorage entries, e.g. the colour scheme.
 */
export async function mockMap(
  page: Page,
  rows: object[],
  options: { centre?: { lat: number; lng: number }; storage?: Record<string, string> } = {},
) {
  const centre = options.centre ?? CENTRE;
  await page.route('**/pi-sdk.js', (route) => route.abort());
  await page.route('**/rest/v1/rpc/get_public_business_info*', (route) => route.fulfill({ json: rows }));
  await page.route('https://ipwho.is/**', (route) =>
    route.fulfill({ json: { success: true, latitude: centre.lat, longitude: centre.lng } }),
  );
  // Map clicks reverse-geocode for the country focus; answer "no country"
  await page.route('https://nominatim.openstreetmap.org/**', (route) => route.fulfill({ json: {} }));
  await page.addInitScript(
    ([mockKey, storageKey, user, extra]) => {
      localStorage.setItem(mockKey as string, '1');
      localStorage.setItem(storageKey as string, JSON.stringify({ ...(user as object), lastAuthenticated: Date.now() }));
      localStorage.setItem('location_banner_seen', '1');
      for (const [key, value] of Object.entries(extra as Record<string, string>)) localStorage.setItem(key, value);
    },
    [SANDBOX_MOCK_KEY, STORAGE_KEY, mockUser, options.storage ?? {}],
  );
}

export const pin = (page: Page, name: string) => page.locator(`img.leaflet-marker-icon[alt="${name}"]`);

/**
 * Once the map has loaded, moves it to zoom 17 over CENTRE, where pins stop
 * clustering, and waits for each business's own pin.
 */
export async function zoomToPins(page: Page, rows: { name: string }[], centre = CENTRE) {
  await expect(page.locator('.leaflet-marker-icon').first()).toBeAttached();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1_000);
  await page.evaluate(
    (c) => window.dispatchEvent(new CustomEvent('centerMap', { detail: { lat: c.lat, lng: c.lng, zoom: 17 } })),
    centre,
  );
  for (const b of rows) await expect(pin(page, b.name)).toBeVisible();
  await page.waitForTimeout(800);
}
