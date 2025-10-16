import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting map (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

// Input validation
const validateAddress = (address: string): { valid: boolean; error?: string } => {
  // Check if address exists
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address is required and must be a string' };
  }

  // Trim and check length
  const trimmed = address.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Address must be at least 3 characters' };
  }

  if (trimmed.length > 500) {
    return { valid: false, error: 'Address must be less than 500 characters' };
  }

  // Check for SQL injection patterns
  const sqlPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)/i,
    /(;|\-\-|\/\*|\*\/|xp_|sp_)/i,
  ];

  for (const pattern of sqlPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Invalid characters in address' };
    }
  }

  // Check for script injection
  if (/<script|javascript:/i.test(trimmed)) {
    return { valid: false, error: 'Invalid characters in address' };
  }

  return { valid: true };
};

// Rate limiting function
const checkRateLimit = (identifier: string): { allowed: boolean; error?: string } => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetAt) {
    // Create new rate limit window
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      error: 'Rate limit exceeded. Please try again in a minute.' 
    };
  }

  // Increment count
  userLimit.count++;
  return { allowed: true };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user identifier for rate limiting (IP or user ID)
    const authHeader = req.headers.get('authorization');
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
    let userId = clientIP;

    // If authenticated, use user ID instead of IP
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      console.warn(`Rate limit exceeded for user: ${userId.substring(0, 8)}...`);
      return new Response(
        JSON.stringify({ error: rateLimitCheck.error }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse and validate input
    const { address } = await req.json();
    
    const validation = validateAddress(address);
    if (!validation.valid) {
      console.warn(`Invalid address input: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const sanitizedAddress = address.trim();
    const locationiqToken = Deno.env.get('LOCATIONIQ_TOKEN');
    
    if (!locationiqToken) {
      console.error('LOCATIONIQ_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use LocationIQ global autocomplete API endpoint
    const url = `https://api.locationiq.com/v1/autocomplete?key=${locationiqToken}&q=${encodeURIComponent(sanitizedAddress)}&format=json&limit=5`;
    
    console.log(`Geocoding request for user ${userId.substring(0, 8)}... (length: ${sanitizedAddress.length})`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`LocationIQ API error: ${response.status}`);
      return new Response(
        JSON.stringify({ error: 'Geocoding request failed' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const data = await response.json();
    console.log(`LocationIQ returned ${data.length} suggestions`);
    
    // Transform the response to match our expected format
    const suggestions = data.map((item: any) => ({
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

    return new Response(
      JSON.stringify({ suggestions }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Geocoding error:', error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
