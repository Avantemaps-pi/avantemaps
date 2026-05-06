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

    // Parse optional bounding-box and pagination query params
    const url = new URL(req.url);
    const qp = url.searchParams;
    const parseNum = (v: string | null): number | null => {
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const minLat = parseNum(qp.get('minLat'));
    const maxLat = parseNum(qp.get('maxLat'));
    const minLng = parseNum(qp.get('minLng'));
    const maxLng = parseNum(qp.get('maxLng'));
    const hasBbox =
      minLat != null && maxLat != null && minLng != null && maxLng != null &&
      minLat <= maxLat && minLat >= -90 && maxLat <= 90 &&
      minLng >= -180 && maxLng <= 180;

    const limitRaw = parseNum(qp.get('limit'));
    const offsetRaw = parseNum(qp.get('offset'));
    const limit = limitRaw != null ? Math.min(Math.max(Math.floor(limitRaw), 1), 1000) : null;
    const offset = offsetRaw != null ? Math.max(Math.floor(offsetRaw), 0) : 0;

    const { data, error } = await supabase.rpc('get_public_business_info', { user_uuid: null });
    if (error) throw error;

    const rows = (data ?? []) as PublicBusinessRow[];

    const allMapped = rows
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
      .filter((x): x is NonNullable<typeof x> => x !== null);

    // Bounding-box filter (supports antimeridian wrap when minLng > maxLng)
    const filtered = hasBbox
      ? allMapped.filter((b) => {
          if (b.lat < (minLat as number) || b.lat > (maxLat as number)) return false;
          return (minLng as number) <= (maxLng as number)
            ? b.lng >= (minLng as number) && b.lng <= (maxLng as number)
            : b.lng >= (minLng as number) || b.lng <= (maxLng as number);
        })
      : allMapped;

    const total = filtered.length;
    const paged = limit != null ? filtered.slice(offset, offset + limit) : filtered;

    return new Response(
      JSON.stringify({
        count: paged.length,
        total,
        offset,
        limit,
        bbox: hasBbox ? { minLat, maxLat, minLng, maxLng } : null,
        businesses: paged,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          // Cache 2 min in browsers, 5 min at CDN, allow stale-while-revalidate for 10 min
          'Cache-Control': 'public, max-age=120, s-maxage=300, stale-while-revalidate=600',
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
