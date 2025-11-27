import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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

// Create Supabase Anon client for test mode sign-ins
const supabaseAnon = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!
);

// Internal password used only for Pi auth synthetic accounts
const INTERNAL_PASSWORD =
  Deno.env.get('PI_INTERNAL_PASSWORD') || 'INTERNAL_PI_AUTH_PASSWORD_2024!#%';

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
    console.log(`🔍 [${traceId}] Request details:`, {
      method: req.method,
      clientIP,
      origin: req.headers.get('origin'),
      userAgent: req.headers.get('user-agent')?.substring(0, 100)
    });

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
    const originHeader = req.headers.get('origin') || req.headers.get('referer') || '';
    const isPreviewOrigin = originHeader.includes('lovableproject.com') || originHeader.includes('lovable.app');
    const allowTestMode = Deno.env.get('ALLOW_TEST_MODE') === 'true';
    const testParam = url.searchParams.get('test') === 'true';
    // Allow test mode on previews or dev when explicitly requested via query OR dev token
    let testMode = (testParam && (isDev || isPreviewOrigin));
    
    console.log(`🔍 [${traceId}] Test mode pre-check:`, {
      ENVIRONMENT: Deno.env.get('ENVIRONMENT'),
      isDev,
      ALLOW_TEST_MODE: Deno.env.get('ALLOW_TEST_MODE'),
      allowTestMode,
      isPreviewOrigin,
      originHeader,
      testParam,
      testMode,
      url: req.url
    });

    const rawBody = await req.text();
    let parsedBody: VerifyAuthRequest;

    try {
      parsedBody = JSON.parse(rawBody);
      console.log(`📦 [${traceId}] Parsed request body:`, {
        hasAccessToken: !!parsedBody.accessToken,
        uid: parsedBody.uid,
        username: parsedBody.username
      });
    } catch (parseError) {
      console.error(`❌ [${traceId}] JSON parse error:`, {
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
        rawBodyLength: rawBody.length,
        rawBodyPreview: rawBody.substring(0, 100)
      });
      return new Response(JSON.stringify({
        verified: false,
        error: 'Invalid request format',
        details: 'Body must be valid JSON.',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { accessToken, uid, username } = parsedBody;

    // If known dev token is used, allow test mode for preview/dev origins even without env flags
    const tokenLooksDev = accessToken === 'dev-test-token';
    if (tokenLooksDev && (isDev || isPreviewOrigin)) {
      testMode = true;
    }
    console.log(`🧪 [${traceId}] Test mode post-check:`, { tokenLooksDev, testMode });

    if (!accessToken || !uid || !username) {
      return new Response(JSON.stringify({
        verified: false,
        error: 'Missing required fields',
        details: 'accessToken, uid, and username are required.',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ✅ Test mode (development / preview): do NOT rely on email-password
    if (testMode) {
      console.log(`🧪 [${traceId}] Test mode: ensure user exists and try admin.createSession`);

      const email = `${username}@pi.local`;

      // Ensure user exists (idempotent)
      const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error(`❌ [${traceId}] Failed to list users:`, listError);
        throw new Error(`Failed to list users: ${listError.message}`);
      }
    // Look up by BOTH old format (id = pi_uid) and new format (metadata.pi_uid)
    // This handles the transition period where old users exist
    const existingUser = usersList?.users.find((u) => 
      u.id === uid || u.user_metadata?.pi_uid === uid
    );
    
    let supabaseUserId: string;

      if (!existingUser) {
        console.log(`🔨 [${traceId}] Creating new test user:`, { uid, email, username });
        // Let Supabase generate the UUID
        const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { username, full_name: username, pi_uid: uid },
        });
        if (createError) {
          console.error(`❌ [${traceId}] Failed to create user:`, createError);
          throw new Error(`Failed to create user: ${createError.message}`);
        }
        
        supabaseUserId = newUserData.user.id;
        console.log(`✅ [${traceId}] Created test Supabase user ${supabaseUserId} for Pi UID ${uid}`);
        
        // Insert into public.users with pi_uid mapping
        const { error: insertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: supabaseUserId,
            pi_uid: uid,
            username,
            email,
            subscription: 'individual',
          });
        
        if (insertError) {
          console.error(`❌ [${traceId}] Failed to create public user:`, insertError);
          throw new Error(`Failed to create public user: ${insertError.message}`);
        }
      } else {
        supabaseUserId = existingUser.id;
        console.log(`ℹ️ [${traceId}] Test user already exists:`, { supabaseUserId, pi_uid: uid, email });
      }

      // Create session using password auth with verification
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
        password: INTERNAL_PASSWORD,
        email_confirm: true, // Ensure email is confirmed
      });

      if (passwordError) {
        console.error(`❌ [${traceId}] Failed to set internal password:`, passwordError);
        throw new Error(`Failed to set internal password: ${passwordError.message}`);
      }

      // Small delay to ensure password is committed
      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: sessionData, error: sessionError } = await supabaseAnon.auth.signInWithPassword({
        email,
        password: INTERNAL_PASSWORD,
      });

      if (sessionError || !sessionData?.session?.access_token) {
        console.error(`❌ [${traceId}] Session creation failed:`, sessionError);
        throw new Error(`Session creation failed: ${sessionError?.message || 'No session data'}`);
      }

      // Verify the session works by checking the user
      const { data: verifyUser, error: verifyError } =
        await supabaseAnon.auth.getUser(sessionData.session.access_token);
      if (verifyError || !verifyUser?.user || verifyUser.user.id !== supabaseUserId) {
        console.error(`❌ [${traceId}] Session verification failed:`, verifyError);
        throw new Error(`Session verification failed: ${verifyError?.message || 'User mismatch'}`);
      }
        console.error(`❌ [${traceId}] Session verification failed:`, verifyError);
        throw new Error(`Session verification failed: ${verifyError?.message || 'User mismatch'}`);
      }

      const access_token = sessionData.session.access_token;
      const refresh_token = sessionData.session.refresh_token;
      console.log(`✅ [${traceId}] Test session created and verified successfully`);
      return new Response(JSON.stringify({
        verified: true,
        testMode: true,
        user: { uid: supabaseUserId, pi_uid: uid, username, wallet_address: 'TEST_WALLET_123' },
        supabase_token: access_token,
        refresh_token: refresh_token,
        traceId,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Verify token with Pi API ---
    console.log(`🔐 [${traceId}] Verifying token with Pi API`);
    const verifyResponse = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const rawResponse = await verifyResponse.text();
    console.log(`📡 [${traceId}] Pi API response:`, {
      status: verifyResponse.ok,
      statusCode: verifyResponse.status,
      responseLength: rawResponse.length
    });

    if (!verifyResponse.ok) {
      console.error(`❌ [${traceId}] Pi API verification failed:`, {
        status: verifyResponse.status,
        response: rawResponse.substring(0, 200)
      });
      return new Response(JSON.stringify({
        verified: false,
        error: 'Authentication failed',
        details: 'Could not verify credentials with Pi Network',
        traceId,
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const piUserData = JSON.parse(rawResponse);
    const user = piUserData.user ?? piUserData;
    
    console.log(`👤 [${traceId}] Pi user data:`, {
      uid: user.uid,
      username: user.username,
      hasWallet: !!user.wallet_address
    });

    if (user.uid !== uid || user.username !== username) {
      console.error(`❌ [${traceId}] User mismatch:`, {
        expectedUid: uid,
        actualUid: user.uid,
        expectedUsername: username,
        actualUsername: user.username
      });
      return new Response(JSON.stringify({
        verified: false,
        error: 'Authentication failed',
        details: 'Credential verification failed',
        traceId,
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Supabase Auth Integration ---
    console.log(`🔧 [${traceId}] Setting up Supabase auth integration`);
    const email = `${username}@pi.local`;

    const { data: usersList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error(`❌ [${traceId}] Failed to list users:`, listError);
      throw new Error(`Failed to list users: ${listError.message}`);
    }
    
    // Look up by BOTH old format (id = pi_uid) and new format (metadata.pi_uid)
    // This handles the transition period where old users exist
    const existingUser = usersList?.users.find((u) => 
      u.id === uid || u.user_metadata?.pi_uid === uid
    );

    let supabaseUserId: string;
    
    if (!existingUser) {
      console.log(`🔨 [${traceId}] Creating new Supabase user:`, { uid, email, username });
      // Let Supabase generate the UUID
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { username, full_name: username, pi_uid: uid },
      });
      
      if (createError) {
        console.error(`❌ [${traceId}] Failed to create user:`, createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }
      
      supabaseUserId = newUserData.user.id;
      console.log(`✅ [${traceId}] Created Supabase user ${supabaseUserId} for Pi UID ${uid}`);
      
      // Insert into public.users with pi_uid mapping
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: supabaseUserId,
          pi_uid: uid,
          username,
          email,
          subscription: 'individual',
        });
      
      if (insertError) {
        console.error(`❌ [${traceId}] Failed to create public user:`, insertError);
        throw new Error(`Failed to create public user: ${insertError.message}`);
      }
    } else {
      supabaseUserId = existingUser.id;
      console.log(`ℹ️ [${traceId}] User already exists:`, { supabaseUserId, pi_uid: uid, email });
    }

    // --- Create session using password auth with verification ---
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
      password: INTERNAL_PASSWORD,
      email_confirm: true, // Ensure email is confirmed
    });

    if (passwordError) {
      console.error(`❌ [${traceId}] Failed to set internal password:`, passwordError);
      throw new Error(`Failed to set internal password: ${passwordError.message}`);
    }

    // Small delay to ensure password is committed
    await new Promise(resolve => setTimeout(resolve, 100));

    const { data: sessionData, error: sessionError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password: INTERNAL_PASSWORD,
    });

    if (sessionError || !sessionData?.session?.access_token) {
      console.error(`❌ [${traceId}] Session creation error:`, sessionError);
      throw new Error(`Session creation failed: ${sessionError?.message || 'No session data'}`);
    }

    // Verify the session works by checking the user
    const { data: verifyUser, error: verifyError } =
      await supabaseAnon.auth.getUser(sessionData.session.access_token);
    if (verifyError || !verifyUser?.user || verifyUser.user.id !== supabaseUserId) {
      console.error(`❌ [${traceId}] Session verification failed:`, verifyError);
      throw new Error(`Session verification failed: ${verifyError?.message || 'User mismatch'}`);
    }
    
    const access_token = sessionData.session.access_token;
    const refresh_token = sessionData.session.refresh_token;
    console.log(`✅ [${traceId}] Production session created and verified successfully`);

    return new Response(JSON.stringify({
      verified: true,
      user: {
        uid: supabaseUserId,
        pi_uid: uid,
        username: user.username,
        wallet_address: user.wallet_address || null,
      },
      supabase_token: access_token,
      refresh_token,
      traceId,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error(`💥 [${traceId}] Internal error:`, {
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      type: err?.constructor?.name
    });
    return new Response(JSON.stringify({
      verified: false,
      error: 'Authentication service error',
      details: 'An unexpected error occurred during authentication',
      traceId,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
