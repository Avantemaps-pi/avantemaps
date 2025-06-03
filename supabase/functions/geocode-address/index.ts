
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address } = await req.json()
    const locationiqToken = Deno.env.get('LOCATIONIQ_TOKEN')
    
    if (!locationiqToken) {
      return new Response(
        JSON.stringify({ error: 'LocationIQ token not configured' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!address) {
      return new Response(
        JSON.stringify({ error: 'Address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Use LocationIQ Geocoding API
    const response = await fetch(
      `https://api.locationiq.com/v1/search.php?key=${locationiqToken}&q=${encodeURIComponent(address)}&format=json&limit=1`
    )

    if (!response.ok) {
      throw new Error(`LocationIQ API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Address not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const result = data[0]
    const coordinates = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    }

    return new Response(
      JSON.stringify({ coordinates }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Geocoding error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
