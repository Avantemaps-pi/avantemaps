import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an AI assistant for Avante Maps, a business discovery platform for Pi cryptocurrency adoption.

WHAT AVANTE MAPS IS:
- A web application that connects Pi holders with businesses accepting Pi cryptocurrency
- Features business discovery via interactive map, business registration, analytics, and subscriptions
- Helps businesses gain exposure and consumers find places to spend Pi
- Offers free listings and premium subscription tiers (Individual, Organization, Enterprise)
- Plans to introduce NFT-based business cards for digital identity

WHAT YOU CAN HELP WITH:
- Explaining how to use Avante Maps
- How to register a business
- What subscription tiers offer
- How verification and certification work (general process only)
- How to find businesses on the map
- Features like bookmarks, recommendations, analytics
- General questions about Pi cryptocurrency adoption
- Navigating the interface and features

WHAT YOU MUST NOT SHARE:
- User emails, usernames, wallet addresses, or any personal data
- Business owner contact information or wallet addresses
- Payment details, transaction IDs, or amounts
- API keys or technical implementation details
- Specific user subscription status or business verification status
- Internal business logic or admin processes
- Database structure or technical architecture

SECURITY RULES:
- If asked about specific user data, politely decline and explain privacy policies
- If asked about internal systems, redirect to general feature explanations
- Never reveal database structure or technical architecture
- Don't confirm or deny specific business verification statuses
- If asked about sensitive information, respond with: "I can't share specific user or business data for privacy reasons, but I'd be happy to explain how [feature] works in general."

TONE: Friendly, helpful, professional, enthusiastic about Pi ecosystem and helping users discover businesses.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service not configured');
    }

    console.log('Streaming AI chat with', messages.length, 'messages');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ 
          error: 'Too many requests. Please try again in a moment.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.error('Payment required for AI gateway');
        return new Response(JSON.stringify({ 
          error: 'AI service temporarily unavailable. Please try again later.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'AI service error. Please try again.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
  } catch (error) {
    console.error('Error in chat-ai function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
