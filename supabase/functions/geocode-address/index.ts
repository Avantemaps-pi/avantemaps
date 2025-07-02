
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();
    
    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const locationiqToken = Deno.env.get('LOCATIONIQ_TOKEN');
    
    if (!locationiqToken) {
      console.error('LOCATIONIQ_TOKEN not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Use LocationIQ global autocomplete API endpoint
    const url = `https://api.locationiq.com/v1/autocomplete?key=${locationiqToken}&q=${encodeURIComponent(address)}&format=json&limit=5`;
    
    console.log('Making request to LocationIQ global endpoint for address:', address);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('LocationIQ API error:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Geocoding request failed' }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const data = await response.json();
    console.log('LocationIQ response:', data);
    
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
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
