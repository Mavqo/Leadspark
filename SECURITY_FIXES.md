# Security Fixes Report - LeadSpark

**Date:** 2026-04-05  
**Project:** LeadSpark - AI Lead Capture Suite  
**Scope:** Security hardening for API endpoints

---

## Summary

This document details all security fixes applied to the LeadSpark project. All vulnerabilities have been addressed while maintaining compatibility with existing functionality.

---

## Fixes Applied

### CRITICAL

#### 1. CORS Configuration ✅ FIXED
**File:** `src/lib/cors.ts` (NEW)

**Issue:** No CORS middleware was configured for API endpoints, potentially allowing unauthorized cross-origin requests.

**Solution:**
- Created new `src/lib/cors.ts` module with configurable CORS support
- Supports environment-based origin configuration via `CORS_ALLOWED_ORIGINS`
- Implements preflight handling for OPTIONS requests
- Provides `withCors()` wrapper and `applyCorsHeaders()` helper

**Configuration:**
```env
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**Applied to:**
- `src/pages/api/chat.ts`
- `src/pages/api/lead.ts`
- `src/pages/api/webhook/n8n.ts`

---

#### 2. XSS Prevention ✅ FIXED
**Files:** `src/lib/security.ts` (NEW), `src/pages/api/chat.ts`, `src/pages/api/lead.ts`

**Issue:** User input in chat messages and lead data was not sanitized before storage/return, creating XSS vulnerability.

**Solution:**
- Created `sanitizeHtml()` function in `src/lib/security.ts` that:
  - Removes dangerous HTML tags (script, iframe, object, embed, etc.)
  - Strips event handlers (onclick, onerror, onload, etc.)
  - Removes `javascript:` and `vbscript:` protocols
  - Blocks data URIs that could execute code
  - Sanitizes inline expressions

- Applied sanitization in:
  - `chat.ts`: Sanitizes user messages on input and assistant replies before storage
  - `lead.ts`: Sanitizes text fields (name, sintomi, durata, disponibilita, notes)

**Example:**
```typescript
// Before storing messages
message = sanitizeHtml(message);
context.history.push({ role: 'assistant', content: sanitizeHtml(chatResponse.reply) });
```

---

#### 3. Insecure Session ID Generation ✅ FIXED
**File:** `src/lib/openai.ts`

**Issue:** Line 213 used `Math.random()` for session ID generation, which is not cryptographically secure.

**Fix:**
```typescript
// BEFORE (vulnerable):
export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// AFTER (secure):
export function generateSessionId(): string {
  // SECURITY FIX: Use crypto.randomUUID() instead of Math.random()
  // for cryptographically secure session ID generation
  return `sess_${Date.now()}_${crypto.randomUUID()}`;
}
```

---

### HIGH

#### 4. Admin Endpoint Security ✅ FIXED
**File:** `src/pages/api/lead.ts`

**Issues:**
1. Authentication was optional (only checked if adminToken existed)
2. No rate limiting specific to admin endpoint
3. No pagination, potentially exposing all leads at once

**Fixes Applied:**

**a) Mandatory Authentication:**
```typescript
// Reject if admin token is not configured
if (!adminToken) {
  return new Response(
    JSON.stringify({ error: 'Admin access not configured', code: 'NOT_CONFIGURED' }),
    { status: 503 }
  );
}

// Verify Bearer token
if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
    { status: 401 }
  );
}
```

**b) Admin-Specific Rate Limiting:**
```typescript
// Add admin rate limiter config (5 requests per minute)
rateLimiter.setConfig('admin:lead', 60 * 1000, 5);

const adminLimit = rateLimiter.checkWithHeaders(clientIP, 'admin:lead');
if (!adminLimit.allowed) {
  return createRateLimitResponse(adminLimit.retryAfter || 60);
}
```

**c) Pagination:**
```typescript
const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

const total = allLeads.length;
const totalPages = Math.ceil(total / limit);
const offset = (page - 1) * limit;
const paginatedLeads = allLeads.slice(offset, offset + limit);

// Response includes pagination metadata
{
  pagination: {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}
```

---

### MEDIUM

#### 5. Request Size Limit ✅ FIXED
**Files:** `src/lib/security.ts`, `src/pages/api/chat.ts`, `src/pages/api/lead.ts`, `src/pages/api/webhook/n8n.ts`

**Issue:** No limit on request body size, potentially allowing DoS via large payloads.

**Solution:**
- Created `parseJsonBody()` function in `src/lib/security.ts` with configurable size limit
- Created `checkRequestSize()` helper function
- Applied 1MB limit to all POST endpoints

**Implementation:**
```typescript
// In API routes:
const bodyResult = await parseJsonBody(request, 1024 * 1024); // 1MB limit
if (!bodyResult.success) {
  return new Response(
    JSON.stringify({ error: bodyResult.error, code: bodyResult.code }),
    { status: 413 }
  );
}
let body: unknown = bodyResult.data;
```

---

#### 6. Security Headers ✅ FIXED
**File:** `src/lib/security.ts`

**Issue:** Missing security headers on API responses.

**Solution:**
- Created `SECURITY_HEADERS` constant with:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

- Created `applySecurityHeaders()` function to apply headers to any Response
- Created `createSecureResponse()` helper for new responses

**Applied to all API endpoints:**
- `src/pages/api/chat.ts`
- `src/pages/api/lead.ts`
- `src/pages/api/webhook/n8n.ts`

---

## New Files Created

### 1. `src/lib/cors.ts`
CORS configuration middleware with:
- Configurable allowed origins via environment variable
- Preflight request handling
- `withCors()` wrapper for API routes
- `applyCorsHeaders()` helper function

### 2. `src/lib/security.ts`
Security utilities including:
- `SECURITY_HEADERS` - Standard security headers
- `applySecurityHeaders()` - Apply headers to responses
- `sanitizeHtml()` - XSS prevention through HTML sanitization
- `sanitizeObject()` - Recursive object sanitization
- `checkRequestSize()` - Request size validation
- `parseJsonBody()` - Safe JSON parsing with size limits
- `generateSecureToken()` - Cryptographically secure token generation
- `secureCompare()` - Timing-safe string comparison
- `maskSensitiveData()` - Data masking for logging

---

## Modified Files

### 1. `src/lib/openai.ts`
- Changed `generateSessionId()` to use `crypto.randomUUID()` instead of `Math.random()`

### 2. `src/pages/api/chat.ts`
- Added CORS headers to all responses
- Added security headers to all responses
- Added request size limit (1MB)
- Added XSS sanitization for user messages and assistant replies
- Updated error responses to include security headers

### 3. `src/pages/api/lead.ts`
- Added CORS headers to all responses
- Added security headers to all responses
- Added request size limit (1MB)
- Added XSS sanitization for lead text fields
- **FIXED:** Admin endpoint now requires mandatory authentication
- **ADDED:** Admin-specific rate limiting (5 req/min)
- **ADDED:** Pagination support with metadata

### 4. `src/pages/api/webhook/n8n.ts`
- Added CORS headers to all responses
- Added security headers to all responses
- Added request size limit (1MB)
- Updated error responses to include security headers

---

## Preserved Security Features

The following existing security features were NOT modified and remain in place:

- ✅ Rate limiting implementation (enhanced with admin-specific limits)
- ✅ Zod validation schemas
- ✅ PII masking in logs
- ✅ HMAC webhook verification
- ✅ WEBHOOK_SECRET environment variable validation

---

## Environment Variables

Ensure these environment variables are set:

```env
# Required for CORS
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Required for admin access
ADMIN_TOKEN=your-secure-admin-token

# Required for webhook verification
WEBHOOK_SECRET=your-webhook-secret

# Required for OpenAI
OPENAI_API_KEY=sk-...

# Required for webhook functionality
N8N_WEBHOOK_URL=https://...
```

---

## Testing

The build completes successfully:
```bash
npm run build
# ✓ Completed in 8.49s
```

---

## Security Checklist

- [x] No hardcoded secrets
- [x] All user inputs validated
- [x] XSS prevention implemented
- [x] CSRF protection via CORS
- [x] Rate limiting on all endpoints
- [x] Security headers configured
- [x] Request size limits applied
- [x] Admin authentication required
- [x] Cryptographically secure random generation
- [x] Pagination on data listing endpoints

---

## Recommendations

1. **Set up CORS_ALLOWED_ORIGINS** - Configure the environment variable to restrict cross-origin requests
2. **Use strong ADMIN_TOKEN** - Generate a secure random token (at least 32 characters)
3. **Monitor rate limits** - Watch logs for rate limit violations indicating potential attacks
4. **Implement HTTPS** - Ensure production deployment uses HTTPS
5. **Regular security audits** - Review and update dependencies regularly

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Astro Security Best Practices](https://docs.astro.build/en/guides/security/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
