import type { APIRoute } from 'astro';
import { z } from 'zod';
import { rateLimiter, createRateLimitResponse, RateLimiter } from '../../../lib/rate-limiter';
import { getCorsHeaders, handleCorsPreflight } from '../../../lib/cors';
import { applySecurityHeaders } from '../../../lib/security';
import type { WebhookEvent, ApiError } from '../../../types/paziente';

// Schema validazione evento webhook
const webhookEventSchema = z.object({
  event: z.enum(['paziente.qualified', 'notification.sent', 'notification.failed']),
  data: z.object({
    pazienteId: z.string().optional(),
    paziente: z.record(z.any()).optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime()
  })
});

// Secret per verifica HMAC
// SECURITY FIX: Removed hardcoded default secret - now throws if not configured
const WEBHOOK_SECRET = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_SECRET environment variable is required');
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  const preflight = handleCorsPreflight(request);
  if (preflight) return applySecurityHeaders(preflight);
  
  try {
    // 1. Rate limiting
    const clientIP = RateLimiter.getClientIP(request);
    const ipLimit = rateLimiter.checkWithHeaders(clientIP, 'webhook:ip');
    
    if (!ipLimit.allowed) {
      console.warn(`[Webhook n8n] Rate limit exceeded for IP: ${clientIP}`);
      const response = createRateLimitResponse(ipLimit.retryAfter || 60);
      return applySecurityHeaders(response);
    }
    
    // 1.5. Check request size (1MB limit)
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!isNaN(size) && size > 1024 * 1024) {
        const error: ApiError = {
          error: 'Request body too large. Maximum size is 1MB.',
          code: 'REQUEST_TOO_LARGE'
        };
        const response = new Response(
          JSON.stringify(error),
          { status: 413, headers: { 'Content-Type': 'application/json' } }
        );
        return applySecurityHeaders(response);
      }
    }
    
    // 2. Verifica HMAC signature
    const signature = request.headers.get('x-webhook-signature');
    if (!signature) {
      console.warn('[Webhook n8n] Missing signature header');
      const error: ApiError = {
        error: 'Missing webhook signature',
        code: 'MISSING_SIGNATURE'
      };
      return new Response(
        JSON.stringify(error),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Parse body
    let bodyText: string;
    try {
      bodyText = await request.text();
    } catch {
      const error: ApiError = {
        error: 'Invalid request body',
        code: 'INVALID_BODY'
      };
      return new Response(
        JSON.stringify(error),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 4. Verifica firma
    const isValid = await verifySignature(bodyText, signature);
    if (!isValid) {
      console.warn('[Webhook n8n] Invalid signature');
      const error: ApiError = {
        error: 'Invalid webhook signature',
        code: 'INVALID_SIGNATURE'
      };
      const response = new Response(
        JSON.stringify(error),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
      return applySecurityHeaders(response);
    }
    
    // 5. Parse JSON
    let body: unknown;
    try {
      body = JSON.parse(bodyText);
    } catch {
      const error: ApiError = {
        error: 'Invalid JSON body',
        code: 'INVALID_JSON'
      };
      return new Response(
        JSON.stringify(error),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 6. Validazione Zod
    const parseResult = webhookEventSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      const error: ApiError = {
        error: 'Invalid event format',
        code: 'VALIDATION_ERROR',
        details: { errors }
      };
      return new Response(
        JSON.stringify(error),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const event = parseResult.data as WebhookEvent;
    
    // 7. Gestione evento
    await handleEvent(event);
    
    // 8. Risposta successo
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...getCorsHeaders(request),
      ...ipLimit.headers,
      'X-Response-Time': `${Date.now() - startTime}ms`,
      'X-Event-Processed': event.event
    });
    
    console.log(`[Webhook n8n] Event ${event.event} processed successfully`);
    
    const response = new Response(
      JSON.stringify({ received: true, event: event.event }),
      { status: 200, headers }
    );
    return applySecurityHeaders(response);
    
  } catch (error) {
    console.error('[Webhook n8n] Error:', error);
    
    const errorResponse: ApiError = {
      error: 'An unexpected error occurred while processing webhook',
      code: 'INTERNAL_ERROR'
    };
    
    const errorHeaders = new Headers({
      'Content-Type': 'application/json',
      ...getCorsHeaders(request),
      'X-Response-Time': `${Date.now() - startTime}ms`
    });
    
    const response = new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: errorHeaders
      }
    );
    
    return applySecurityHeaders(response);
  }
};

// Gestione eventi
async function handleEvent(event: WebhookEvent): Promise<void> {
  switch (event.event) {
    case 'paziente.qualified':
      await handlePazienteQualified(event);
      break;
      
    case 'notification.sent':
      await handleNotificationSent(event);
      break;
      
    case 'notification.failed':
      await handleNotificationFailed(event);
      break;
      
    default:
      console.warn(`[Webhook n8n] Unknown event type: ${(event as WebhookEvent).event}`);
  }
}

// Paziente qualificato
async function handlePazienteQualified(event: WebhookEvent): Promise<void> {
  const { pazienteId, paziente } = event.data;
  
  console.log('[Webhook n8n] Paziente qualified:', {
    pazienteId,
    name: paziente?.name,
    urgenza: paziente?.urgenza,
    timestamp: event.data.timestamp
  });
  
  // Qui si potrebbero:
  // - Aggiornare lo stato del paziente nel DB
  // - Inviare notifica push allo staff
  // - Triggerare automazioni aggiuntive
  
  // Esempio: log dettagliato per urgenza alta
  if (paziente?.urgenza === 'alta') {
    console.log('[Webhook n8n] ⚠️ URGENZA ALTA - Paziente richiede attenzione immediata:', pazienteId);
  }
}

// Notifica inviata
async function handleNotificationSent(event: WebhookEvent): Promise<void> {
  const { pazienteId, message } = event.data;
  
  console.log('[Webhook n8n] Notification sent:', {
    pazienteId,
    message,
    timestamp: event.data.timestamp
  });
}

// Notifica fallita
async function handleNotificationFailed(event: WebhookEvent): Promise<void> {
  const { pazienteId, message } = event.data;
  
  console.error('[Webhook n8n] Notification failed:', {
    pazienteId,
    message,
    timestamp: event.data.timestamp
  });
  
  // Qui si potrebbero:
  // - Riprova automatico
  // - Allerta admin
  // - Cambio canale notifica
}

// Verifica HMAC signature
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(WEBHOOK_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const computed = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    const computedHex = Array.from(new Uint8Array(computed))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Timing-safe comparison
    if (computedHex.length !== signature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < computedHex.length; i++) {
      result |= computedHex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error('[Webhook n8n] Signature verification error:', error);
    return false;
  }
}

// Health check endpoint
export const GET: APIRoute = ({ request }) => {
  // Handle CORS preflight
  const preflight = handleCorsPreflight(request);
  if (preflight) return applySecurityHeaders(preflight);
  
  const response = new Response(
    JSON.stringify({ 
      status: 'ok', 
      service: 'webhook-n8n',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200, 
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders(request)
      } 
    }
  );
  
  return applySecurityHeaders(response);
};
