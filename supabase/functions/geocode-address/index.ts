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

type GeocodingOptions = {
  viewbox?: string; // "minLon,minLat,maxLon,maxLat"
  countrycodes?: string; // e.g., "za,us"
  tag?: string; // e.g., "address,place"
};

type Suggestion = {
  display_name: string;
  lat: number;
  lon: number;
  place_id?: string;
  osm_id?: string;
  address: {
    house_number: string;
    road: string;
    city: string;
    town: string;
    village: string;
    municipality: string;
    state: string;
    province: string;
    region: string;
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

const fetchMapboxSuggestions = async (query: string, options: GeocodingOptions = {}): Promise<Suggestion[]> => {
  const token = Deno.env.get('MAPBOX_TOKEN');
  if (!token) {
    console.error('❌ MAPBOX_TOKEN environment variable is not set');
    throw new Error('Mapbox token not configured');
  }

  // Build URL with Mapbox Geocoding API v5
  const encodedQuery = encodeURIComponent(query);
  const params = new URLSearchParams({
    access_token: token,
    limit: '7',
    autocomplete: 'true',
    types: 'address,place,locality,neighborhood,postcode',
  });

  // Add optional country code filtering (Mapbox uses comma-separated ISO codes)
  if (options.countrycodes) {
    params.append('country', options.countrycodes.toLowerCase());
  }

  // Add optional bbox for location bias (Mapbox format: minLon,minLat,maxLon,maxLat)
  if (options.viewbox) {
    params.append('bbox', options.viewbox);
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?${params.toString()}`;
  console.log('📍 Fetching from Mapbox:', query, options.countrycodes ? `(country: ${options.countrycodes})` : '');
  
  const res = await fetch(url);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('❌ Mapbox API error:', {
      status: res.status,
      statusText: res.statusText,
      body: errorText
    });
    throw new Error(`Mapbox API error: ${res.status} - ${errorText}`);
  }
  
  const data = await res.json();
  console.log('✅ Mapbox returned', data.features?.length || 0, 'suggestions');

  return (data.features || []).map((feature: any) => {
    // Parse context for address components
    const context = feature.context || [];
    const getContextValue = (type: string) => {
      const item = context.find((c: any) => c.id?.startsWith(type));
      return item?.text || '';
    };

    // Extract address number from the feature
    const addressNumber = feature.address || '';
    const streetName = feature.text || '';
    
    // Build display name similar to LocationIQ format
    const placeName = feature.place_name || '';

    return {
      display_name: placeName,
      lat: feature.center?.[1] || 0,
      lon: feature.center?.[0] || 0,
      place_id: feature.id,
      osm_id: feature.id,
      address: {
        house_number: addressNumber,
        road: streetName,
        city: getContextValue('place') || getContextValue('locality'),
        town: getContextValue('place'),
        village: getContextValue('locality'),
        municipality: getContextValue('district'),
        state: getContextValue('region'),
        province: getContextValue('region'),
        region: getContextValue('region'),
        postcode: getContextValue('postcode'),
        country: getContextValue('country'),
      }
    };
  });
};

const fetchNominatimSuggestions = async (query: string, options: GeocodingOptions = {}): Promise<Suggestion[]> => {
  // Build URL with improved parameters
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    limit: '7',
    dedupe: '1',
  });

  // Add optional viewbox for location bias
  if (options.viewbox) {
    params.append('viewbox', options.viewbox);
    params.append('bounded', '0');
  }

  // Add optional country code filtering
  if (options.countrycodes) {
    params.append('countrycodes', options.countrycodes);
  }
  
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
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
    place_id: item.place_id,
    osm_id: item.osm_id,
    address: {
      house_number: item.address?.house_number || '',
      road: item.address?.road || '',
      city: item.address?.city || '',
      town: item.address?.town || '',
      village: item.address?.village || '',
      municipality: item.address?.municipality || '',
      state: item.address?.state || '',
      province: item.address?.province || '',
      region: item.address?.region || item.address?.state_district || '',
      postcode: item.address?.postcode || '',
      country: item.address?.country || ''
    }
  }));
};

const fetchGeocodingSuggestions = async (query: string, options: GeocodingOptions = {}): Promise<Suggestion[]> => {
  try {
    // Try Mapbox first (primary provider)
    return await fetchMapboxSuggestions(query, options);
  } catch (mapboxError: any) {
    console.warn('⚠️ Mapbox failed, falling back to Nominatim:', mapboxError.message);
    
    try {
      // Fallback to Nominatim (free, no API key required)
      return await fetchNominatimSuggestions(query, options);
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

    const body = await req.json();
    const { address, viewbox, countrycodes, tag } = body;
    
    const validation = validateAddress(address);
    if (!validation.valid) return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: CORS_HEADERS });

    // Build options from request
    const options: GeocodingOptions = {};
    if (viewbox) options.viewbox = viewbox;
    if (countrycodes) options.countrycodes = countrycodes;
    if (tag) options.tag = tag;

    const suggestions = await fetchGeocodingSuggestions(address.trim(), options);

    return new Response(JSON.stringify({ suggestions }), { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error('❌ Geocode error:', err.message || err);
    const errorMessage = err.message?.includes('Mapbox') 
      ? 'Address lookup service error. Please try again.'
      : 'Service temporarily unavailable';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: CORS_HEADERS });
  }
});
