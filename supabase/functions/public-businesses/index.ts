// Public read-only API: returns minimal business data for display on external marketing sites.
// No auth required. Aggressively cached at the CDN edge.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

interface PublicBusinessRow {
  id: number;
  name: string;
  category: string | null;
  business_types: string[] | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinates: string | null;
  is_verified: boolean | null;
  is_certified: boolean | null;
  images: string[] | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data, error } = await supabase.rpc('get_public_business_info', { user_uuid: null });
    if (error) throw error;

    const rows = (data ?? []) as PublicBusinessRow[];

    const businesses = rows
      .map((b) => {
        let lat = b.latitude;
        let lng = b.longitude;
        if ((lat == null || lng == null) && b.coordinates) {
          try {
            const c = JSON.parse(b.coordinates);
            lat = c.lat;
            lng = c.lng;
          } catch {
            // ignore
          }
        }
        if (lat == null || lng == null) return null;

        return {
          id: String(b.id),
          name: b.name,
          category: b.category ?? 'Other',
          businessTypes: b.business_types ?? [],
          lat,
          lng,
          city: b.city ?? null,
          country: b.country ?? null,
          isVerified: !!b.is_verified,
          isCertified: !!b.is_certified,
          image: b.images?.[0] ?? null,
        };
      })
      .filter(Boolean);

    return new Response(
      JSON.stringify({ count: businesses.length, businesses }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // Cache 5 min at CDN, allow stale-while-revalidate for 10 min
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
        },
      },
    );
  } catch (err) {
    console.error('public-businesses error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch businesses' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
