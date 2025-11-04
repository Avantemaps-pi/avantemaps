import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Pi Network Authentication Verification
 * with Supabase Auth integration (fixed JWT)
 */

interface VerifyAuthRequest {
  accessToken: string;
  uid: string;
  username: string;
}

// Create Supabase Admin client (Service Role Key)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Rate limiting tracking
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((record.resetTime - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const traceId = crypto.randomUUID();
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                   req.headers.get('x-real-ip') || 
                   'unknown';

  try {
    // 🛡️ Rate limiting check
    const rateLimitCheck = checkRateLimit(clientIP);
    if (!rateLimitCheck.allowed) {
      console.warn(`⚠️ [${traceId}] Rate limit exceeded for IP: ${clientIP}`);
      return new Response(JSON.stringify({
        verified: false,
        error: 'Too many requests',
        details: `Please wait ${rateLimitCheck.retryAfter} seconds before trying again.`,
        retryAfter: rateLimitCheck.retryAfter,
        traceId,
      }), { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitCheck.retryAfter)
        } 
      });
    }

    console.log(`🚀 [${traceId}] verify-pi-auth invoked from IP: ${clientIP}`);

    const url = new URL(req.url);
    const isDev = Deno.env.get('ENVIRONMENT') === 'development';
    const allowTestMode = Deno.env.get('ALLOW_TEST_MODE') === 'true';
    const testParam = url.searchParams.get('test') === 'true';
    const testMode = isDev && allowTestMode && testParam;
    
    console.log(`🔍 [${traceId}] Test mode check:`, {
      ENVIRONMENT: Deno.env.get('ENVIRONMENT'),
      isDev,
      ALLOW_TEST_MODE: Deno.env.get('ALLOW_TEST_MODE'),
      allowTestMode,
      testParam,
      testMode,
      url: req.url
    });

    const rawBody = await req.text();
    let parsedBody: VerifyAuthRequest;

    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({
        verified: false,
        error: 'Invalid request format',
        details: 'Body must be valid JSON.',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { accessToken, uid, username } = parsedBody;

    if (!accessToken || !uid || !username) {
      return new Response(JSON.stringify({
        verified: false,
        error: 'Missing required fields',
        details: 'accessToken, uid, and username are required.',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  // ✅ Test mode (development, create Supabase session)
if (testMode) {
  console.log(`🧪 [${traceId}] Test mode: Creating Supabase user and JWT`);

  const email = `${username}@pi.local`;

  // Check if user exists
  const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = usersList?.users.find((u) => u.id === uid);

  if (!existingUser) {
    await supabaseAdmin.auth.admin.createUser({
      id: uid,
      email,
      email_confirm: true,
      user_metadata: { username },
    });
    console.log(`✅ [${traceId}] Created test Supabase user ${uid}`);
  }

  // Generate valid JWT token using generateLink
  const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  
  if (tokenError || !tokenData) {
    console.error(`❌ [${traceId}] Failed to generate JWT:`, tokenError);
    throw new Error('Failed to generate test JWT');
  }

  return new Response(JSON.stringify({
    verified: true,
    testMode: true,
    message: 'Verification bypassed (development mode with session).',
    user: { uid, username, wallet_address: 'TEST_WALLET_123' },
    supabase_token: tokenData.properties.access_token, // ✅ Include token for session
    traceId,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

    // --- Verify token with Pi API ---
    const verifyResponse = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const rawResponse = await verifyResponse.text();

    if (!verifyResponse.ok) {
      return new Response(JSON.stringify({
        verified: false,
        error: 'Pi API verification failed',
        details: rawResponse,
        traceId,
      }), { status: verifyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const piUserData = JSON.parse(rawResponse);
    const user = piUserData.user ?? piUserData;

    if (user.uid !== uid || user.username !== username) {
      return new Response(JSON.stringify({
        verified: false,
        error: 'User mismatch',
        details: 'UID or username does not match token data.',
        traceId,
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Supabase Auth Integration ---
    const email = `${username}@pi.local`;

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersList?.users.find((u) => u.id === uid);

    if (!existingUser) {
      await supabaseAdmin.auth.admin.createUser({
        id: uid,
        email,
        email_confirm: true,
        user_metadata: { username },
      });
      console.log(`✅ [${traceId}] Created new Supabase user ${uid}`);
    }

    // --- Generate proper JWT with `sub` claim ---
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    
    if (tokenError || !tokenData) {
      console.error(`❌ [${traceId}] Failed to generate JWT:`, tokenError);
      throw new Error('Failed to generate JWT token');
    }

    return new Response(JSON.stringify({
      verified: true,
      user: {
        uid: user.uid,
        username: user.username,
        wallet_address: user.wallet_address || null,
      },
      supabase_token: tokenData.properties.access_token, // valid token with `sub`
      traceId,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error(`💥 [${traceId}] Internal error:`, err);
    return new Response(JSON.stringify({
      verified: false,
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown runtime error.',
      traceId,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
