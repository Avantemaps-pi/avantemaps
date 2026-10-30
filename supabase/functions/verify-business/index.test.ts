/**
 * Unit tests for verify-business's contact email requirement, with Supabase, auth and the Pi
 * Horizon API mocked.
 * Run (no local Deno needed):
 *   docker run --rm -v "$PWD:/app" -w /app denoland/deno:2.1.4 test --allow-env --allow-net --allow-read supabase/functions/verify-business/index.test.ts
 */
import { assertEquals } from 'jsr:@std/assert@1';
import { installFakeSupabase, loadHandler, setFunctionEnv, type Row } from '../../../tests/deno/fakeSupabase.ts';

setFunctionEnv();
const handler = await loadHandler(new URL('./index.ts', import.meta.url).href);

const OWNER = '00000000-0000-0000-0000-0000000000a1';
const GOOD_WALLET = 'GGOODWALLET';
const POOR_WALLET = 'GPOORWALLET';

// supabase-js starts auth refresh timers for each client, which Deno's sanitizers would report
const test = (name: string, fn: () => Promise<void>) =>
  Deno.test({ name, fn, sanitizeOps: false, sanitizeResources: false });

// 120 payments received from 12 wallets: passes 100 transactions, 50 credited, 10 wallets
const payments = (wallet: string, count: number) =>
  Array.from({ length: count }, (_, i) => ({
    type: 'payment',
    from: `GSENDER${i % 12}`,
    to: wallet,
    paging_token: String(i),
  }));

function setup(business: Partial<Row>) {
  const row: Row = {
    id: 7,
    owner_id: OWNER,
    business_name: 'Harbour Light Coffee',
    pi_wallet_address: GOOD_WALLET,
    contact_info: { email: 'Hello@Harbour.example' },
    contact_email_verified_for: null,
    contact_email_verified_at: null,
    is_verified: false,
    is_certified: false,
    verification_status: null,
    ...business,
  };
  const fake = installFakeSupabase({
    tables: { businesses: [row] },
    users: { 'owner-token': OWNER },
    external: (url) => {
      if (url.host !== 'api.mainnet.minepi.com') return undefined;
      const wallet = url.pathname.split('/')[2]!;
      return Response.json({ _embedded: { records: payments(wallet, wallet === GOOD_WALLET ? 120 : 5) } });
    },
  });
  return { fake, row };
}

const verify = async (verification_type: 'verification' | 'certification' = 'verification') => {
  const res = await handler(
    new Request('http://fn/verify-business', {
      method: 'POST',
      headers: { Authorization: 'Bearer owner-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: 7, verification_type }),
    }),
  );
  const body = await res.json();
  return { status: res.status, result: body.results?.[0] };
};

test('wallet passes but the contact email is not confirmed: not verified, "Contact email not confirmed"', async () => {
  const { fake, row } = setup({});
  try {
    const { status, result } = await verify();
    assertEquals(status, 200);
    assertEquals(result.verified, false);
    assertEquals(result.contactConfirmed, false);
    assertEquals(result.reason, 'Contact email not confirmed');
    assertEquals(row.is_verified, false);
  } finally {
    fake.restore();
  }
});

test('wallet passes and the contact email is confirmed: verified', async () => {
  const { fake, row } = setup({ contact_email_verified_for: 'hello@harbour.example', contact_email_verified_at: '2026-10-30T10:00:00Z' });
  try {
    const { result } = await verify();
    assertEquals(result.verified, true);
    assertEquals(result.contactConfirmed, true);
    assertEquals(result.reason, null);
    assertEquals(row.is_verified, true);
    assertEquals(row.verification_status, 'verified');
  } finally {
    fake.restore();
  }
});

test('a changed contact email undoes the confirmation', async () => {
  const { fake } = setup({ contact_info: { email: 'new@harbour.example' }, contact_email_verified_for: 'hello@harbour.example' });
  try {
    const { result } = await verify();
    assertEquals(result.verified, false);
    assertEquals(result.contactConfirmed, false);
    assertEquals(result.reason, 'Contact email not confirmed');
  } finally {
    fake.restore();
  }
});

test('no contact email: "Add and confirm a contact email"', async () => {
  const { fake } = setup({ contact_info: {} });
  try {
    const { result } = await verify();
    assertEquals(result.verified, false);
    assertEquals(result.contactConfirmed, false);
    assertEquals(result.reason, 'Add and confirm a contact email');
  } finally {
    fake.restore();
  }
});

test('certification needs the confirmed contact email too', async () => {
  const unconfirmed = setup({});
  try {
    const { result } = await verify('certification');
    assertEquals(result.verified, false);
    assertEquals(unconfirmed.row.is_certified, false);
  } finally {
    unconfirmed.fake.restore();
  }
  const confirmed = setup({ contact_email_verified_for: 'hello@harbour.example' });
  try {
    const { result } = await verify('certification');
    assertEquals(result.verified, true);
    assertEquals(confirmed.row.is_certified, true);
  } finally {
    confirmed.fake.restore();
  }
});

test('wallet and contact both failing: both reasons, joined', async () => {
  const { fake } = setup({ pi_wallet_address: POOR_WALLET });
  try {
    const { result } = await verify();
    assertEquals(result.verified, false);
    assertEquals(
      result.reason,
      'Only 5 transactions (need 100+); Only 5 unique wallets (need 10+); Only 5 credited transactions (need 50+); Contact email not confirmed',
    );
  } finally {
    fake.restore();
  }
});
