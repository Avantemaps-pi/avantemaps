import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const brevoApiKey = Deno.env.get('BREVO_API_KEY')!;

const OTP_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
// Wrong guesses allowed per code; after that it's dead until a new one is sent
const MAX_ATTEMPTS = 5;

type ErrorCode = 'cooldown' | 'email_failed' | 'not_contact_email' | 'too_many_attempts' | 'expired' | 'invalid';

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const fail = (status: number, error: string, error_code?: ErrorCode) =>
  json(error_code ? { error, error_code } : { error }, status);

// Emails are compared and stored lower-cased and trimmed
const normaliseEmail = (email: unknown) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

// Uniform 6-digit code from a CSPRNG (rejection sampling avoids modulo bias)
function generateOTP(): string {
  const range = 900000;
  const limit = Math.floor(0x100000000 / range) * range;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return String(100000 + (buf[0] % range));
}

async function sendOTPEmail(email: string, otp: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'Avante Maps',
          email: 'support@avantemaps.com',
        },
        to: [{ email }],
        // The code is in the subject and the first line, so it can be copied from the inbox
        // list or the notification without opening the email
        subject: `Your Avante Maps code: ${otp}`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <p style="color: #1a1a1a; font-size: 16px;">Your code is <strong>${otp}</strong></p>
            <h2 style="color: #1a1a1a;">Verify Your Contact Information</h2>
            <p style="color: #555;">Use the code below to verify your business contact email on Avante Maps. This code expires in <strong>15 minutes</strong>.</p>
            <div style="background: #f4f4f4; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a1a;">${otp}</span>
            </div>
            <p style="color: #999; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Brevo API error [${response.status}]:`, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error('sendOTPEmail error:', err);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ SECURITY: Require authenticated caller
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return fail(401, 'Unauthorized');
    }
    const callerToken = authHeader.replace('Bearer ', '');
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: authData, error: authError } = await authClient.auth.getUser(callerToken);
    if (authError || !authData?.user) {
      return fail(401, 'Unauthorized');
    }
    const authenticatedUserId = authData.user.id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, otp, business_id } = body;
    const email = normaliseEmail(body.email);

    if (!action || !email) {
      return fail(400, 'Missing required fields');
    }
    if (action !== 'send' && action !== 'verify') {
      return fail(400, 'Unknown action');
    }
    if (!business_id) {
      return fail(400, 'Missing business_id');
    }
    if (action === 'verify' && !otp) {
      return fail(400, 'Missing otp');
    }

    // ✅ SECURITY: the caller must own the business, and the email must be its current contact
    // email, so codes can't be sent to (or confirmed for) any other address
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select('owner_id, contact_info')
      .eq('id', business_id)
      .maybeSingle();
    if (bizError || !biz || biz.owner_id !== authenticatedUserId) {
      return fail(403, 'Forbidden: not the business owner');
    }
    const contactEmail = normaliseEmail(
      typeof biz.contact_info === 'object' && biz.contact_info !== null ? biz.contact_info.email : null,
    );
    if (!contactEmail || email !== contactEmail) {
      return fail(400, "This isn't the business's contact email", 'not_contact_email');
    }

    if (action === 'send') {
      // ✅ SECURITY: per-email cooldown (60s) to prevent spamming
      // (expires_at - OTP_TTL_MS is when the code was last sent)
      const { data: existing } = await supabase
        .from('contact_otps')
        .select('otp, expires_at, verified, attempts')
        .eq('email', email)
        .maybeSingle();
      if (existing?.expires_at) {
        const issuedAtMs = new Date(existing.expires_at).getTime() - OTP_TTL_MS;
        if (Date.now() - issuedAtMs < RESEND_COOLDOWN_MS) {
          return fail(429, 'Please wait before requesting another code', 'cooldown');
        }
      }

      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
      // A resend while the code still works sends the same code again (an older email stays
      // valid) and restarts its 15 minutes. Its wrong attempts carry over, so resending never
      // buys more guesses; a used, expired or locked code gets replaced.
      const reusable =
        existing &&
        !existing.verified &&
        new Date(existing.expires_at).getTime() > Date.now() &&
        Number(existing.attempts ?? 0) < MAX_ATTEMPTS;

      let code: string;
      if (reusable) {
        code = existing.otp;
        const { error: updateError } = await supabase
          .from('contact_otps')
          .update({ expires_at: expiresAt })
          .eq('email', email);
        if (updateError) {
          console.error('OTP update error:', updateError);
          return fail(500, 'Failed to store OTP');
        }
      } else {
        code = generateOTP();
        // A new code starts with no wrong attempts
        const { error: upsertError } = await supabase
          .from('contact_otps')
          .upsert({ email, otp: code, expires_at: expiresAt, verified: false, attempts: 0 }, { onConflict: 'email' });
        if (upsertError) {
          console.error('OTP upsert error:', upsertError);
          return fail(500, 'Failed to store OTP');
        }
      }

      const sent = await sendOTPEmail(email, code);
      if (!sent) {
        return fail(500, 'Failed to send OTP email', 'email_failed');
      }

      return json({ success: true, message: 'OTP sent' });
    }

    // action === 'verify'
    const { data: stored, error: fetchError } = await supabase
      .from('contact_otps')
      .select('otp, expires_at, verified, attempts')
      .eq('email', email)
      .maybeSingle();

    if (fetchError || !stored) {
      return fail(400, 'No code was requested for this email', 'invalid');
    }
    if (stored.verified) {
      return fail(400, 'That code has already been used', 'expired');
    }
    if (new Date(stored.expires_at) < new Date()) {
      return fail(400, 'OTP expired', 'expired');
    }
    const attempts = Number(stored.attempts ?? 0);
    if (attempts >= MAX_ATTEMPTS) {
      return fail(429, 'Too many attempts. Request a new code', 'too_many_attempts');
    }

    // ✅ SECURITY: take this attempt before comparing the code. The update only applies if no
    // other request took it first, so parallel guesses can't get more than MAX_ATTEMPTS tries.
    const { data: claimed, error: claimError } = await supabase
      .from('contact_otps')
      .update({ attempts: attempts + 1 })
      .eq('email', email)
      .eq('attempts', attempts)
      .select('email');
    if (claimError || !claimed || claimed.length === 0) {
      return fail(400, 'Invalid OTP', 'invalid');
    }

    if (stored.otp !== String(otp).trim()) {
      return fail(400, 'Invalid OTP', 'invalid');
    }

    // Single use: only the request that flips verified records the confirmation
    const { data: used } = await supabase
      .from('contact_otps')
      .update({ verified: true })
      .eq('email', email)
      .eq('verified', false)
      .select('email');
    if (!used || used.length === 0) {
      return fail(400, 'That code has already been used', 'expired');
    }

    // The confirmation lives in columns only the service role can write (see the
    // contact_email_confirmation migration); verify-business compares it with the
    // current contact email
    const { error: confirmError } = await supabase
      .from('businesses')
      .update({ contact_email_verified_at: new Date().toISOString(), contact_email_verified_for: email })
      .eq('id', business_id);
    if (confirmError) {
      console.error('Contact confirmation update error:', confirmError);
      return fail(500, 'Failed to record the confirmation');
    }

    return json({ success: true, message: 'Contact info verified' });
  } catch (err) {
    console.error('contact-otp error:', err);
    return fail(500, 'Internal server error');
  }
});
