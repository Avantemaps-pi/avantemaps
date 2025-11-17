/**
 * Simple in-memory rate limiting for edge functions
 * Tracks requests per IP address to prevent abuse
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  windowMs?: number;  // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number;  // Max requests per window (default: 10)
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;  // Seconds until reset
}

/**
 * Check if a request should be rate limited
 * @param identifier - Usually IP address or user ID
 * @param config - Rate limit configuration
 * @returns Object indicating if request is allowed and retry time if not
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = {}
): RateLimitResult {
  const windowMs = config.windowMs ?? 60000;  // Default: 1 minute
  const maxRequests = config.maxRequests ?? 10;  // Default: 10 requests
  
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  // If no record or window expired, create new record
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    });
    return { allowed: true };
  }
  
  // Check if limit exceeded
  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment counter
  record.count++;
  return { allowed: true };
}

/**
 * Extract client IP from request headers
 * @param req - Request object
 * @returns Client IP address or 'unknown'
 */
export function getClientIP(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

/**
 * Create a rate limit error response
 * @param retryAfter - Seconds until reset
 * @param traceId - Optional trace ID for logging
 * @param corsHeaders - CORS headers to include
 * @returns Response object
 */
export function createRateLimitResponse(
  retryAfter: number,
  traceId?: string,
  corsHeaders: Record<string, string> = {}
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`,
      retryAfter,
      ...(traceId && { traceId })
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter)
      }
    }
  );
}
