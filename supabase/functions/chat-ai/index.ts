import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { containsMaliciousContent } from '../_shared/contentFilter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']), // Block 'system' from client
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message exceeds maximum length (2000 chars)')
});

const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema)
    .min(1, 'At least one message required')
    .max(20, 'Too many messages in history (max 20)')
});

// Rate limit configuration
const RATE_LIMITS = {
  individual: { requests: 10, windowMs: 60000 },
  'small-business': { requests: 30, windowMs: 60000 },
  organization: { requests: 100, windowMs: 60000 }
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function checkRateLimit(userId: string, userTier: string = 'individual'): Promise<{ allowed: boolean; resetAt: number; remaining: number }> {
  const now = Date.now();
  const config = RATE_LIMITS[userTier] || RATE_LIMITS.individual;
  const windowStart = new Date(now - config.windowMs);
  
  const { data, error } = await supabase
    .from('api_rate_limits')
    .select('created_at')
    .eq('user_id', userId)
    .eq('endpoint', 'chat-ai')
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, resetAt: now + config.windowMs, remaining: config.requests };
  }
  
  const requestCount = data?.length || 0;
  const remaining = Math.max(0, config.requests - requestCount);
  
  if (requestCount >= config.requests) {
    const oldestRequest = new Date(data[0].created_at).getTime();
    return {
      allowed: false,
      resetAt: oldestRequest + config.windowMs,
      remaining: 0
    };
  }
  
  await supabase.from('api_rate_limits').insert({
    user_id: userId,
    endpoint: 'chat-ai'
  });
  
  return {
    allowed: true,
    resetAt: now + config.windowMs,
    remaining: remaining - 1
  };
}

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
    // Extract user ID from JWT
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    const jwt = JSON.parse(atob(token.split('.')[1]));
    const userId = jwt.sub;
    
    // Get user subscription tier
    const { data: userData } = await supabase
      .from('users')
      .select('subscription')
      .eq('id', userId)
      .single();
    
    const userTier = userData?.subscription || 'individual';
    
    // Check rate limit
    const rateLimit = await checkRateLimit(userId, userTier);
    
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter,
          message: `Too many requests. Try again in ${retryAfter} seconds.`
        }),
        { 
          status: 429,
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(RATE_LIMITS[userTier].requests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(rateLimit.resetAt / 1000))
          }
        }
      );
    }
    
    // Validate input
    const rawBody = await req.json();
    const validationResult = ChatRequestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Invalid chat request:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request format',
          details: validationResult.error.issues.map(e => e.message)
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const { messages } = validationResult.data;
    
    // Check each message for malicious content (prompt injection, data extraction)
    for (const msg of messages) {
      if (containsMaliciousContent(msg.content)) {
        console.log('Blocked message with malicious content');
        return new Response(
          JSON.stringify({ 
            error: 'Invalid message content',
            message: 'Your message contains prohibited patterns. Please rephrase and try again.'
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      throw new Error('AI service not configured');
    }

    // Filter out any system messages (extra safety)
    const userMessages = messages.filter(m => m.role !== 'system');
    
    console.log('Streaming AI chat with', userMessages.length, 'messages');

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
          ...userMessages,
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
