import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, getClientIP, createRateLimitResponse } from '../_shared/rateLimit.ts';

// PiNet Metadata DTO types following Pi Platform documentation
interface OGImage {
  url: string;
  secure_url?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
}

interface TwitterMetadata {
  card: 'summary' | 'summary_large_image' | 'player' | 'app';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  image_alt?: string;
}

interface OGMetadata {
  type: 'website' | 'article' | 'business.business' | 'profile';
  url: string;
  title: string;
  description: string;
  image?: OGImage | OGImage[];
  site_name?: string;
  locale?: string;
  [key: string]: any; // Allow additional OG properties
}

interface PiNetMetadataDTO {
  title: string;
  description: string;
  authors?: Array<{ name: string; url?: string }>;
  keywords?: string[];
  og?: OGMetadata;
  twitter?: TwitterMetadata;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting: 30 requests per minute for metadata endpoint
  const clientIP = getClientIP(req);
  const rateLimitCheck = checkRateLimit(clientIP, { windowMs: 60000, maxRequests: 30 });
  
  if (!rateLimitCheck.allowed) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return createRateLimitResponse(rateLimitCheck.retryAfter!, undefined, corsHeaders);
  }

  try {
    const url = new URL(req.url);
    const pathname = url.searchParams.get('pathname') || '/';

    console.log('PiNet metadata request for pathname:', pathname);

    // Base URL for the application
    const baseUrl = url.origin;
    const ogImageUrl = `${baseUrl}/og-image.png`;

    // Default metadata
    let metadata: PiNetMetadataDTO = {
      title: 'Avante Maps - Discover Local Businesses with Pi Network',
      description: 'Find and explore local businesses on Avante Maps. Register your business, get discovered by customers, and transact with Pi cryptocurrency.',
      keywords: ['pi network', 'local businesses', 'business directory', 'cryptocurrency', 'pi payment', 'avante maps'],
      authors: [{ name: 'Avante Maps Team' }],
      og: {
        type: 'website',
        url: baseUrl,
        title: 'Avante Maps - Local Business Discovery',
        description: 'Discover local businesses and pay with Pi Network cryptocurrency',
        site_name: 'Avante Maps',
        locale: 'en_US',
        image: {
          url: ogImageUrl,
          secure_url: ogImageUrl,
          type: 'image/png',
          width: 1200,
          height: 630,
          alt: 'Avante Maps - Local Business Directory'
        }
      },
      twitter: {
        card: 'summary_large_image',
        site: '@AvanteMap',
        title: 'Avante Maps - Discover Local Businesses',
        description: 'Find local businesses and pay with Pi Network',
        image: ogImageUrl,
        image_alt: 'Avante Maps Preview'
      }
    };

    // Route-specific metadata
    if (pathname.startsWith('/recommendations')) {
      metadata = {
        ...metadata,
        title: 'Discover Recommended Businesses - Avante Maps',
        description: 'Browse curated recommendations for top local businesses. Find the best restaurants, shops, and services in your area.',
        keywords: ['business recommendations', 'top businesses', 'local favorites', 'pi network businesses'],
        og: {
          ...metadata.og,
          type: 'website',
          title: 'Business Recommendations on Avante Maps',
          description: 'Discover top-rated local businesses recommended by the community',
          url: `${baseUrl}/recommendations`
        },
        twitter: {
          card: metadata.twitter?.card || 'summary_large_image',
          title: 'Business Recommendations - Avante Maps',
          description: 'Discover top-rated local businesses'
        }
      };
    } else if (pathname.startsWith('/bookmarks')) {
      metadata = {
        ...metadata,
        title: 'My Saved Businesses - Avante Maps',
        description: 'Access your saved favorite businesses. Keep track of places you want to visit or recommend.',
        og: {
          ...metadata.og,
          type: 'website',
          title: 'Saved Businesses - Avante Maps',
          url: `${baseUrl}/bookmarks`
        }
      };
    } else if (pathname.startsWith('/pricing')) {
      metadata = {
        ...metadata,
        title: 'Pricing & Subscriptions - Avante Maps',
        description: 'Choose the perfect subscription plan for your needs. Pay with Pi Network cryptocurrency. Individual, small business, and organization tiers available.',
        keywords: ['pi network pricing', 'subscription plans', 'pi payment', 'business subscription'],
        og: {
          ...metadata.og,
          type: 'website',
          title: 'Avante Maps Pricing - Pay with Pi',
          description: 'Flexible subscription plans powered by Pi Network',
          url: `${baseUrl}/pricing`
        }
      };
    } else if (pathname.startsWith('/registration')) {
      metadata = {
        ...metadata,
        title: 'Register Your Business - Avante Maps',
        description: 'Register your business on Avante Maps and reach customers in your area. Accept Pi Network payments and grow your presence.',
        keywords: ['business registration', 'register business', 'pi network business', 'list my business'],
        og: {
          ...metadata.og,
          type: 'website',
          title: 'Register Your Business on Avante Maps',
          description: 'Join the Pi Network business community',
          url: `${baseUrl}/registration`
        }
      };
    } else if (pathname.startsWith('/analytics')) {
      metadata = {
        ...metadata,
        title: 'Business Analytics - Avante Maps',
        description: 'Track your business performance with detailed analytics. Monitor views, engagement, and customer interactions.',
        og: {
          type: 'website',
          title: 'Business Analytics Dashboard',
          description: metadata.og?.description || 'Track your business performance',
          url: `${baseUrl}/analytics`
        }
      };
    }

    return new Response(
      JSON.stringify(metadata),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating PiNet metadata:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
