import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json'
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000; // 1 min
const RATE_LIMIT_MAX = 10;

type AddressValidation = { valid: boolean; error?: string };
type Suggestion = {
  display_name: string;
  lat: number;
  lon: number;
  address: {
    house_number: string;
    road: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  };
};

// --- Utilities ---
const validateAddress = (address: string): AddressValidation => {
  if (!address || typeof address !== 'string') return { valid: false, error: 'Address required' };
  const trimmed = address.trim();
  if (trimmed.length < 3) return { valid: false, error: 'Address must be at least 3 characters' };
  if (trimmed.length > 500) return { valid: false, error: 'Address too long' };
  if (/(<script|javascript:)/i.test(trimmed)) return { valid: false, error: 'Invalid characters in address' };
  if (/(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b|;|--|\/\*|\*\/|xp_|sp_)/i.test(trimmed)) {
    return { valid: false, error: 'Suspicious characters in address' };
  }
  return { valid: true };
};

const checkRateLimit = (id: string) => {
  const now = Date.now();
  const entry = rateLimitMap.get(id);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(id, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  if (entry.count >= RATE_LIMIT_MAX) return { allowed: false, error: 'Rate limit exceeded' };
  entry.count++;
  return { allowed: true };
};

const getUserFromToken = async (token: string) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
};

const fetchLocationIQSuggestions = async (query: string): Promise<Suggestion[]> => {
  const token = Deno.env.get('LOCATIONIQ_TOKEN');
  if (!token) {
    console.error('❌ LOCATIONIQ_TOKEN environment variable is not set');
    throw new Error('LocationIQ token not configured');
  }

  const url = `https://api.locationiq.com/v1/autocomplete?key=${token}&q=${encodeURIComponent(query)}&format=json&limit=5`;
  console.log('📍 Fetching from LocationIQ:', query);
  
  const res = await fetch(url);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ LocationIQ API error:', {
      status: res.status,
      statusText: res.statusText,
      body: errorText
    });
    throw new Error(`LocationIQ API error: ${res.status} - ${errorText}`);
  }
  
  const data = await res.json();
  console.log('✅ LocationIQ returned', data.length, 'suggestions');

  return data.map((item: any) => ({
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    address: {
      house_number: item.address?.house_number || '',
      road: item.address?.road || '',
      city: item.address?.city || item.address?.town || item.address?.village || '',
      state: item.address?.state || item.address?.state_district || '',
      postcode: item.address?.postcode || '',
      country: item.address?.country || ''
    }
  }));
};

const fetchNominatimSuggestions = async (query: string): Promise<Suggestion[]> => {
  // Nominatim is free and doesn't require an API key
  // Rate limit: 1 request per second (we respect this in our usage)
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;
  
  console.log('🌍 Fetching from Nominatim (fallback):', query);
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'AvanteMaps/1.0' // Nominatim requires a User-Agent
    }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Nominatim API error:', {
      status: res.status,
      statusText: res.statusText,
      body: errorText
    });
    throw new Error(`Nominatim API error: ${res.status}`);
  }
  
  const data = await res.json();
  console.log('✅ Nominatim returned', data.length, 'suggestions');

  return data.map((item: any) => ({
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    address: {
      house_number: item.address?.house_number || '',
      road: item.address?.road || '',
      city: item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || '',
      state: item.address?.state || item.address?.province || item.address?.region || item.address?.state_district || '',
      postcode: item.address?.postcode || '',
      country: item.address?.country || ''
    }
  }));
};

const fetchGeocodingSuggestions = async (query: string): Promise<Suggestion[]> => {
  try {
    // Try LocationIQ first (primary provider)
    return await fetchLocationIQSuggestions(query);
  } catch (locationIQError: any) {
    console.warn('⚠️ LocationIQ failed, falling back to Nominatim:', locationIQError.message);
    
    try {
      // Fallback to Nominatim (free, no API key required)
      return await fetchNominatimSuggestions(query);
    } catch (nominatimError: any) {
      console.error('❌ Both geocoding providers failed');
      throw new Error('All geocoding providers unavailable');
    }
  }
};

// --- Main handler ---
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS });

  try {
    // Try to get user from token, but allow unauthenticated requests
    let rateLimitKey = 'anon';
    const authHeader = req.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const user = await getUserFromToken(token);
      if (user) {
        rateLimitKey = user.id;
      }
    }

    const rateCheck = checkRateLimit(rateLimitKey);
    if (!rateCheck.allowed) return new Response(JSON.stringify({ error: rateCheck.error }), { status: 429, headers: CORS_HEADERS });

    const { address } = await req.json();
    const validation = validateAddress(address);
    if (!validation.valid) return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: CORS_HEADERS });

    const suggestions = await fetchGeocodingSuggestions(address.trim());

    return new Response(JSON.stringify({ suggestions }), { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error('❌ Geocode error:', err.message || err);
    const errorMessage = err.message?.includes('LocationIQ') 
      ? 'Address lookup service error. Please try again.'
      : 'Service temporarily unavailable';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: CORS_HEADERS });
  }
});
