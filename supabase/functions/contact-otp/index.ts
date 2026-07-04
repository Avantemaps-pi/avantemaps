import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const brevoApiKey = Deno.env.get('BREVO_API_KEY')!;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
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
        subject: 'Your Contact Verification Code',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1a1a1a;">Verify Your Contact Information</h2>
            <p style="color: #555;">Use the code below to verify your business contact email on Avante Maps. This code expires in <strong>10 minutes</strong>.</p>
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerToken = authHeader.replace('Bearer ', '');
    const authClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: authData, error: authError } = await authClient.auth.getUser(callerToken);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authenticatedUserId = authData.user.id;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, email, otp, business_id } = body;

    if (!action || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'send') {
      // ✅ SECURITY: require business_id and verify caller owns it (prevents email-bombing arbitrary addresses)
      if (!business_id) {
        return new Response(JSON.stringify({ error: 'Missing business_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: ownerCheck, error: ownerError } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', business_id)
        .maybeSingle();
      if (ownerError || !ownerCheck || ownerCheck.owner_id !== authenticatedUserId) {
        return new Response(JSON.stringify({ error: 'Forbidden: not the business owner' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ✅ SECURITY: per-email cooldown (60s) to prevent spamming
      const { data: existing } = await supabase
        .from('contact_otps')
        .select('expires_at')
        .eq('email', email)
        .maybeSingle();
      if (existing?.expires_at) {
        const issuedAtMs = new Date(existing.expires_at).getTime() - 10 * 60 * 1000;
        if (Date.now() - issuedAtMs < 60 * 1000) {
          return new Response(JSON.stringify({ error: 'Please wait before requesting another code' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      const code = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error: upsertError } = await supabase
        .from('contact_otps')
        .upsert({ email, otp: code, expires_at: expiresAt, verified: false }, { onConflict: 'email' });

      if (upsertError) {
        console.error('OTP upsert error:', upsertError);
        return new Response(JSON.stringify({ error: 'Failed to store OTP' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const sent = await sendOTPEmail(email, code);
      if (!sent) {
        return new Response(JSON.stringify({ error: 'Failed to send OTP email' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'OTP sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify') {
      if (!otp || !business_id) {
        return new Response(JSON.stringify({ error: 'Missing otp or business_id' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ✅ SECURITY: Verify caller owns this business
      const { data: ownerCheck, error: ownerError } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', business_id)
        .maybeSingle();
      if (ownerError || !ownerCheck || ownerCheck.owner_id !== authenticatedUserId) {
        return new Response(JSON.stringify({ error: 'Forbidden: not the business owner' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: stored, error: fetchError } = await supabase
        .from('contact_otps')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchError || !stored) {
        return new Response(JSON.stringify({ error: 'No OTP found for this email' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (stored.verified) {
        return new Response(JSON.stringify({ error: 'OTP already used' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (new Date(stored.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'OTP expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (stored.otp !== otp) {
        return new Response(JSON.stringify({ error: 'Invalid OTP' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from('contact_otps')
        .update({ verified: true })
        .eq('email', email);

      const { data: biz } = await supabase
        .from('businesses')
        .select('contact_info')
        .eq('id', business_id)
        .single();

      if (biz) {
        const updatedContactInfo = {
          ...(typeof biz.contact_info === 'object' && biz.contact_info !== null ? biz.contact_info : {}),
          email_verified: true,
        };
        await supabase
          .from('businesses')
          .update({ contact_info: updatedContactInfo })
          .eq('id', business_id);
      }

      return new Response(JSON.stringify({ success: true, message: 'Contact info verified' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('contact-otp error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
