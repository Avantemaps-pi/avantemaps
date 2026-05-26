// Public read-only API: returns full business details for a single business by ID.
// Designed for the popup/detail page. No auth required. Cached at CDN edge.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

interface BusinessDetailRow {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  business_types: string[] | null;
  keywords: string[] | null;
  images: string[] | null;
  location: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  coordinates: string | null;
  latitude: number | null;
  longitude: number | null;
  is_verified: boolean | null;
  is_certified: boolean | null;
  verification_status: string | null;
  hours: Record<string, { open?: string; close?: string; closed?: boolean }> | null;
  contact_info: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    website?: string;
  } | null;
  rating: number | null;
  total_reviews: number | null;
  created_at: string | null;
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

    const url = new URL(req.url);
    const idRaw = url.searchParams.get('id');
    if (!idRaw) {
      return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const businessId = parseInt(idRaw, 10);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid id parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data, error } = await supabase.rpc('get_public_business_detail', {
      business_id: businessId,
    });

    if (error) throw error;

    const rows = (data ?? []) as BusinessDetailRow[];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Business not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const b = rows[0];

    // Normalize coordinates
    let lat = b.latitude;
    let lng = b.longitude;
    if ((lat == null || lng == null) && b.coordinates) {
      try {
        const c = JSON.parse(b.coordinates);
        lat = c.lat ?? lat;
        lng = c.lng ?? lng;
      } catch {
        // ignore
      }
    }

    // Normalize hours to the string format expected by the frontend
    const normalizedHours: Record<string, string> | undefined = b.hours
      ? Object.entries(b.hours).reduce((acc, [day, val]) => {
          if (val && typeof val === 'object') {
            if (val.closed) {
              acc[day] = 'Closed';
            } else if (val.open && val.close) {
              acc[day] = `${val.open} - ${val.close}`;
            } else {
              acc[day] = 'N/A';
            }
          }
          return acc;
        }, {} as Record<string, string>)
      : undefined;

    const response = {
      id: String(b.id),
      name: b.name,
      description: b.description ?? '',
      category: b.category ?? 'Other',
      business_types: b.business_types ?? [],
      keywords: b.keywords ?? [],
      images: b.images ?? [],
      location: b.location ?? null,
      address: [b.street_address, b.city, b.state, b.postal_code, b.country]
        .filter(Boolean)
        .join(', ') || null,
      streetAddress: b.street_address ?? null,
      city: b.city ?? null,
      state: b.state ?? null,
      postalCode: b.postal_code ?? null,
      country: b.country ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      isVerified: !!b.is_verified,
      isCertified: !!b.is_certified,
      verificationStatus: b.verification_status ?? null,
      hours: normalizedHours,
      phone: b.contact_info?.phone ?? null,
      email: b.contact_info?.email ?? null,
      website: b.contact_info?.website ?? null,
      rating: b.rating ?? 0,
      totalReviews: b.total_reviews ?? 0,
      createdAt: b.created_at,
    };

    return new Response(JSON.stringify({ business: response }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('public-business-detail error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch business details' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
