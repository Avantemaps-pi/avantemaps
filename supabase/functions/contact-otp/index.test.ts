/**
 * Unit tests for contact-otp with Supabase, Brevo and auth mocked.
 * Run (no local Deno needed):
 *   docker run --rm -v "$PWD:/app" -w /app denoland/deno:2.1.4 test --allow-env --allow-net --allow-read supabase/functions/contact-otp/index.test.ts
 */
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { installFakeSupabase, loadHandler, setFunctionEnv, type Row } from '../../../tests/deno/fakeSupabase.ts';

setFunctionEnv();
const handler = await loadHandler(new URL('./index.ts', import.meta.url).href);

const OWNER = '00000000-0000-0000-0000-0000000000a1';

// supabase-js starts auth refresh timers for each client the function creates, which Deno's
// op/resource sanitizers would report as leaks
const test = (name: string, fn: () => Promise<void>) =>
  Deno.test({ name, fn, sanitizeOps: false, sanitizeResources: false });

function setup(options: { brevoOk?: boolean; contactEmail?: string | null } = {}) {
  const sentCodes: string[] = [];
  const business: Row = {
    id: 7,
    owner_id: OWNER,
    contact_info: options.contactEmail === null ? {} : { email: options.contactEmail ?? 'Hello@Harbour.example ' },
    contact_email_verified_for: null,
    contact_email_verified_at: null,
  };
  const fake = installFakeSupabase({
    tables: { businesses: [business], contact_otps: [] },
    users: { 'owner-token': OWNER, 'other-token': '00000000-0000-0000-0000-0000000000b2' },
    external: async (url, init) => {
      if (url.host !== 'api.brevo.com') return undefined;
      const body = JSON.parse(String(init?.body));
      sentCodes.push(/>(\d{6})</.exec(body.htmlContent)![1]!);
      return options.brevoOk === false ? new Response('quota exceeded', { status: 402 }) : Response.json({ messageId: 'm1' });
    },
  });
  return { fake, business, sentCodes };
}

const call = async (body: Record<string, unknown>, token = 'owner-token') => {
  const res = await handler(
    new Request('http://fn/contact-otp', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, body: await res.json() };
};

test('send refuses an email that is not the business contact email', async () => {
  const { fake, sentCodes } = setup();
  try {
    const res = await call({ action: 'send', email: 'someone@else.example', business_id: 7 });
    assertEquals(res.status, 400);
    assertEquals(res.body.error_code, 'not_contact_email');
    assertEquals(sentCodes, []);
    assertEquals(fake.tables.contact_otps, []);
  } finally {
    fake.restore();
  }
});

test('send refuses when the business has no contact email', async () => {
  const { fake, sentCodes } = setup({ contactEmail: null });
  try {
    const res = await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(res.body.error_code, 'not_contact_email');
    assertEquals(sentCodes, []);
  } finally {
    fake.restore();
  }
});

test('send needs the business owner', async () => {
  const { fake } = setup();
  try {
    const res = await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 }, 'other-token');
    assertEquals(res.status, 403);
  } finally {
    fake.restore();
  }
});

test('verify with the right code records contact_email_verified_for (and not contact_info.email_verified)', async () => {
  const { fake, business, sentCodes } = setup();
  try {
    // Compared and stored lower-cased and trimmed
    const sent = await call({ action: 'send', email: ' HELLO@harbour.example', business_id: 7 });
    assertEquals(sent.status, 200);
    assertEquals(sentCodes.length, 1);
    assert(/^\d{6}$/.test(sentCodes[0]!));

    const res = await call({ action: 'verify', email: 'hello@harbour.example', business_id: 7, otp: sentCodes[0] });
    assertEquals(res.status, 200);
    assertEquals(business.contact_email_verified_for, 'hello@harbour.example');
    assert(typeof business.contact_email_verified_at === 'string');
    assertEquals((business.contact_info as Row).email_verified, undefined);

    // Single use
    const again = await call({ action: 'verify', email: 'hello@harbour.example', business_id: 7, otp: sentCodes[0] });
    assertEquals(again.body.error_code, 'expired');
  } finally {
    fake.restore();
  }
});

test('verify refuses an email that is not the business contact email', async () => {
  const { fake, business } = setup();
  try {
    const res = await call({ action: 'verify', email: 'someone@else.example', business_id: 7, otp: '123456' });
    assertEquals(res.body.error_code, 'not_contact_email');
    assertEquals(business.contact_email_verified_for, null);
  } finally {
    fake.restore();
  }
});

test('5 wrong codes, then too_many_attempts even with the right code; a new send resets it', async () => {
  const { fake, business, sentCodes } = setup();
  try {
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    const wrong = sentCodes[0] === '111111' ? '222222' : '111111';
    for (let i = 0; i < 5; i++) {
      const res = await call({ action: 'verify', email: 'hello@harbour.example', business_id: 7, otp: wrong });
      assertEquals(res.status, 400);
      assertEquals(res.body.error_code, 'invalid');
    }
    const blocked = await call({ action: 'verify', email: 'hello@harbour.example', business_id: 7, otp: sentCodes[0] });
    assertEquals(blocked.status, 429);
    assertEquals(blocked.body.error_code, 'too_many_attempts');
    assertEquals(business.contact_email_verified_for, null);

    // After the cooldown, a new code starts with no attempts
    fake.tables.contact_otps[0]!.expires_at = new Date(Date.now() + 8 * 60 * 1000).toISOString();
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(fake.tables.contact_otps[0]!.attempts, 0);
    const ok = await call({ action: 'verify', email: 'hello@harbour.example', business_id: 7, otp: sentCodes[1] });
    assertEquals(ok.status, 200);
  } finally {
    fake.restore();
  }
});

test('error codes: cooldown, email_failed, expired', async () => {
  const { fake, sentCodes } = setup();
  try {
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    const soon = await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(soon.status, 429);
    assertEquals(soon.body.error_code, 'cooldown');

    fake.tables.contact_otps[0]!.expires_at = new Date(Date.now() - 1000).toISOString();
    const late = await call({ action: 'verify', email: 'hello@harbour.example', business_id: 7, otp: sentCodes[0] });
    assertEquals(late.status, 400);
    assertEquals(late.body.error_code, 'expired');
  } finally {
    fake.restore();
  }

  const failing = setup({ brevoOk: false });
  try {
    const res = await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(res.status, 500);
    assertEquals(res.body.error_code, 'email_failed');
  } finally {
    failing.fake.restore();
  }
});
