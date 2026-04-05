/**
 * Security Utilities
 * 
 * Provides security-related helper functions for:
 * - XSS prevention through HTML sanitization
 * - Security headers management
 * - Request size limiting
 * - Input validation utilities
 */

/**
 * Security headers to add to all API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

/**
 * Apply security headers to a Response object
 */
export function applySecurityHeaders(response: Response): Response {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Create a new Response with security headers applied
 */
export function createSecureResponse(
  body: string | object,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): Response {
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...SECURITY_HEADERS,
    ...additionalHeaders
  });

  return new Response(bodyString, { status, headers });
}

/**
 * HTML sanitization for XSS prevention
 * Removes dangerous HTML tags and attributes while allowing safe content
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== 'string') return '';

  // List of dangerous tags to remove completely
  const dangerousTags = [
    'script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea',
    'button', 'select', 'style', 'link', 'meta', 'base', 'head',
    'svg', 'math', 'video', 'audio', 'source', 'track'
  ];

  // List of dangerous attributes to remove
  const dangerousAttributes = [
    'onerror', 'onload', 'onclick', 'onmouse', 'onkey', 'onfocus',
    'onblur', 'onchange', 'onsubmit', 'onreset', 'onselect',
    'javascript:', 'data:text/html', 'data:application/javascript'
  ];

  let sanitized = input;

  // Remove dangerous tags (with content)
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?</${tag}>|<${tag}[^>]*/?>`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Remove dangerous attributes
  dangerousAttributes.forEach(attr => {
    // Match onclick=..., onerror=..., javascript:..., etc.
    const regex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  // Remove event handlers (on* attributes)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove data URIs that could execute code
  sanitized = sanitized.replace(/data:\s*text\/html[^;]*;?[^,]*/gi, '');
  sanitized = sanitized.replace(/data:\s*application\/javascript[^;]*;?[^,]*/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Remove expression() (IE CSS)
  sanitized = sanitized.replace(/expression\s*\(/gi, '');

  return sanitized;
}

/**
 * Sanitize an object recursively (for JSON data)
 * Sanitizes all string values in the object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = Array.isArray(value) 
        ? value.map(item => typeof item === 'string' ? sanitizeHtml(item) : item)
        : sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Check if request body size exceeds limit
 * Returns true if request is within limit
 */
export function checkRequestSize(request: Request, maxSizeBytes: number = 1024 * 1024): boolean {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    return !isNaN(size) && size <= maxSizeBytes;
  }

  return true; // If no content-length, let it through and catch errors during parsing
}

/**
 * Parse JSON body with size limit and error handling
 */
export async function parseJsonBody<T>(
  request: Request,
  maxSizeBytes: number = 1024 * 1024
): Promise<{ success: true; data: T } | { success: false; error: string; code: string }> {
  // Check content length header first
  if (!checkRequestSize(request, maxSizeBytes)) {
    return {
      success: false,
      error: `Request body too large. Maximum size is ${maxSizeBytes / 1024 / 1024}MB.`,
      code: 'REQUEST_TOO_LARGE'
    };
  }

  try {
    // Clone request to be able to read body as text for size check
    const clonedRequest = request.clone();
    const bodyText = await clonedRequest.text();
    
    // Double-check size after reading
    if (bodyText.length > maxSizeBytes) {
      return {
        success: false,
        error: `Request body too large. Maximum size is ${maxSizeBytes / 1024 / 1024}MB.`,
        code: 'REQUEST_TOO_LARGE'
      };
    }

    const data = JSON.parse(bodyText) as T;
    return { success: true, data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Invalid JSON format',
        code: 'INVALID_JSON'
      };
    }
    
    return {
      success: false,
      error: 'Failed to parse request body',
      code: 'PARSE_ERROR'
    };
  }
}

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars * 2) {
    return '*'.repeat(data?.length || 0);
  }
  
  const start = data.slice(0, visibleChars);
  const end = data.slice(-visibleChars);
  const maskedLength = data.length - (visibleChars * 2);
  
  return `${start}${'*'.repeat(maskedLength)}${end}`;
}
