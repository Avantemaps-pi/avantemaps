import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody { owner_id?: string }

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const traceId = crypto.randomUUID();

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const owner_id = body.owner_id;

    if (!owner_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'owner_id is required', traceId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch businesses for this owner using service role (bypasses RLS but scoped by owner_id)
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .select('*')
      .eq('owner_id', owner_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${traceId}] list-user-businesses:`, error);
      return new Response(
        JSON.stringify({ success: false, error: 'Query failed', details: error.message, traceId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, businesses: data ?? [], traceId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error(`[${traceId}] list-user-businesses internal error`, err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: err?.message, traceId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});