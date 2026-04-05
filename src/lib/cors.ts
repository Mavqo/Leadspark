/**
 * CORS Configuration Middleware
 * 
 * Configures Cross-Origin Resource Sharing for API endpoints
 * with secure defaults and environment-based origin validation.
 */

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  allowCredentials: boolean;
  maxAge: number;
}

// Default CORS configuration
const defaultConfig: CorsConfig = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  allowCredentials: true,
  maxAge: 86400 // 24 hours
};

// Load configuration from environment
function loadCorsConfig(): CorsConfig {
  const envOrigins = import.meta.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ALLOWED_ORIGINS;
  
  const allowedOrigins = envOrigins 
    ? envOrigins.split(',').map((o: string) => o.trim()) 
    : defaultConfig.allowedOrigins;

  return {
    ...defaultConfig,
    allowedOrigins
  };
}

const corsConfig = loadCorsConfig();

/**
 * Generate CORS headers for a request
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': corsConfig.allowedMethods.join(', '),
    'Access-Control-Allow-Headers': corsConfig.allowedHeaders.join(', '),
    'Access-Control-Max-Age': corsConfig.maxAge.toString()
  };

  // Check if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    
    if (corsConfig.allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
  }

  return headers;
}

/**
 * Check if an origin is in the allowed list
 */
function isOriginAllowed(origin: string): boolean {
  // If no origins configured, deny all (secure by default)
  if (corsConfig.allowedOrigins.length === 0) {
    return false;
  }

  // Check exact match or wildcard subdomain
  return corsConfig.allowedOrigins.some(allowed => {
    if (allowed === origin) return true;
    if (allowed === '*') return true;
    
    // Support wildcard subdomains like https://*.example.com
    if (allowed.includes('*.')) {
      const pattern = allowed.replace('*.', '.*\\.');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }
    
    return false;
  });
}

/**
 * Handle CORS preflight (OPTIONS) request
 */
export function handleCorsPreflight(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    const headers = new Headers({
      ...getCorsHeaders(request),
      'Content-Type': 'application/json'
    });

    return new Response(null, {
      status: 204,
      headers
    });
  }

  return null;
}

/**
 * Wrap an API route with CORS support
 * Usage: export const POST = withCors(async ({ request }) => { ... });
 */
export function withCors(handler: (ctx: { request: Request; params: Record<string, string> }) => Promise<Response> | Response) {
  return async ({ request, params }: { request: Request; params: Record<string, string> }) => {
    // Handle preflight
    const preflight = handleCorsPreflight(request);
    if (preflight) return preflight;

    // Call handler
    const response = await handler({ request, params });

    // Add CORS headers to response
    const corsHeaders = getCorsHeaders(request);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Middleware to apply CORS headers to API responses
 * For use in Astro API routes
 */
export function applyCorsHeaders(response: Response, request: Request): Response {
  const corsHeaders = getCorsHeaders(request);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
