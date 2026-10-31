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
  const sentEmails: { subject: string; html: string }[] = [];
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
      sentEmails.push({ subject: body.subject, html: body.htmlContent });
      return options.brevoOk === false ? new Response('quota exceeded', { status: 402 }) : Response.json({ messageId: 'm1' });
    },
  });
  return { fake, business, sentCodes, sentEmails };
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

const MINUTE = 60 * 1000;
const expiresInMs = (row: Row) => new Date(String(row.expires_at)).getTime() - Date.now();
// Moves the last send back in time, past the 60s cooldown, keeping the 15-minute window
const sentMinutesAgo = (row: Row, minutes: number) => {
  row.expires_at = new Date(Date.now() + (15 - minutes) * MINUTE).toISOString();
};

test('the code is in the subject and the first line, and lasts 15 minutes', async () => {
  const { fake, sentCodes, sentEmails } = setup();
  try {
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(sentEmails[0]!.subject, `Your Avante Maps code: ${sentCodes[0]}`);
    // The code line comes first, before the heading
    const html = sentEmails[0]!.html;
    const codeLine = `Your code is <strong>${sentCodes[0]}</strong>`;
    assert(html.includes(codeLine));
    assert(html.indexOf(codeLine) < html.indexOf('Verify Your Contact Information'));
    assert(sentEmails[0]!.html.includes('15 minutes'));
    const left = expiresInMs(fake.tables.contact_otps[0]!);
    assert(left > 14.9 * MINUTE && left <= 15 * MINUTE, `expires in ${left}ms`);
  } finally {
    fake.restore();
  }
});

test('resend while the code still works: the same code, 15 minutes again, attempts kept', async () => {
  const { fake, business, sentCodes } = setup();
  try {
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    const wrong = sentCodes[0] === '111111' ? '222222' : '111111';
    for (let i = 0; i < 2; i++) await call({ action: 'verify', email: 'hello@harbour.example', business_id: 7, otp: wrong });
    const row = fake.tables.contact_otps[0]!;
    sentMinutesAgo(row, 9);

    const res = await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(res.status, 200);
    assertEquals(sentCodes.length, 2);
    assertEquals(sentCodes[1], sentCodes[0]);
    assertEquals(row.otp, sentCodes[0]);
    assertEquals(row.attempts, 2);
    assert(expiresInMs(row) > 14.9 * MINUTE);

    // The code from the first email still confirms
    const ok = await call({ action: 'verify', email: 'hello@harbour.example', business_id: 7, otp: sentCodes[0] });
    assertEquals(ok.status, 200);
    assertEquals(business.contact_email_verified_for, 'hello@harbour.example');
  } finally {
    fake.restore();
  }
});

test('resend keeps the cooldown, even when it would reuse the code', async () => {
  const { fake, sentCodes } = setup();
  try {
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    sentMinutesAgo(fake.tables.contact_otps[0]!, 0.5);
    const soon = await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(soon.body.error_code, 'cooldown');
    assertEquals(sentCodes.length, 1);
  } finally {
    fake.restore();
  }
});

test('resend after the code expired or was used: a new code with no attempts', async () => {
  const { fake, sentCodes } = setup();
  try {
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    const row = fake.tables.contact_otps[0]!;
    row.attempts = 3;
    row.expires_at = new Date(Date.now() - 1000).toISOString();
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(row.attempts, 0);
    assertEquals(row.otp, sentCodes[1]);

    row.verified = true;
    sentMinutesAgo(row, 5);
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    assertEquals(row.verified, false);
    assertEquals(row.otp, sentCodes[2]);
    assertEquals(sentCodes.length, 3);
  } finally {
    fake.restore();
  }
});

test('the email has a "Confirm in Avante Maps" button linking to CommuniCon with the code and business', async () => {
  const { fake, sentCodes, sentEmails } = setup();
  try {
    await call({ action: 'send', email: 'hello@harbour.example', business_id: 7 });
    const html = sentEmails[0]!.html;
    const href = `https://avantemapsaebbcf9516.pinet.com/communicon?confirm_code=${sentCodes[0]}&amp;business=7`;
    assert(html.includes(`<a href="${href}"`), 'button link');
    assert(html.includes('>Confirm in Avante Maps</a>'));
    assert(html.includes('background: #2563EB'));
    assert(html.includes('Opens Avante Maps in the Pi Browser. Or type the code above.'));
    // Under the big code
    assert(html.indexOf('letter-spacing: 8px') < html.indexOf('Confirm in Avante Maps'));
  } finally {
    fake.restore();
  }
});

test('PI_APP_LINK_BASE overrides the link base', async () => {
  Deno.env.set('PI_APP_LINK_BASE', 'https://mainnet-example.pinet.com');
  const { fake, sentCodes, sentEmails } = setup();
  try {
    await call({ action: 'send', email: 'hello@harbour.example', business_id: '7' });
    assert(sentEmails[0]!.html.includes(`href="https://mainnet-example.pinet.com/communicon?confirm_code=${sentCodes[0]}&amp;business=7"`));
  } finally {
    Deno.env.delete('PI_APP_LINK_BASE');
    fake.restore();
  }
});

test('a business_id that is not a positive whole number is refused, and nothing is sent', async () => {
  const { fake, sentCodes } = setup();
  try {
    for (const business_id of ['7&x=1', -7, 7.5]) {
      const res = await call({ action: 'send', email: 'hello@harbour.example', business_id });
      assertEquals(res.status, 400);
    }
    assertEquals(sentCodes, []);
  } finally {
    fake.restore();
  }
});
