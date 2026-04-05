import type { APIRoute } from 'astro';
import { z } from 'zod';
import { rateLimiter, createRateLimitResponse, RateLimiter } from '../../lib/rate-limiter';
import { getCorsHeaders, handleCorsPreflight } from '../../lib/cors';
import { applySecurityHeaders, parseJsonBody, sanitizeHtml } from '../../lib/security';
import type { Paziente, LeadRequest, LeadResponse, ApiError } from '../../types/paziente';

// Schema validazione strict
const leadRequestSchema = z.object({
  name: z.string().min(2).max(100).transform(s => s.trim()),
  phone: z.string()
    .min(8)
    .max(20)
    .transform(s => s.trim())
    .refine(
      (val) => /^[\d\s\+\-\(\)\.]{8,20}$/.test(val),
      { message: 'Invalid phone number format' }
    ),
  email: z.string().email().max(100).optional().transform(s => s?.trim()),
  sintomi: z.string().min(5).max(1000).transform(s => s.trim()),
  durata: z.string().min(2).max(200).transform(s => s.trim()),
  urgenza: z.enum(['bassa', 'media', 'alta']),
  disponibilita: z.string().min(2).max(500).transform(s => s.trim()),
  notes: z.string().max(2000).optional().transform(s => s?.trim())
});

// In-memory storage per demo
const leadsStore = new Map<string, Paziente>();

// Add admin rate limiter config (5 requests per minute)
rateLimiter.setConfig('admin:lead', 60 * 1000, 5);

// Webhook URL (da configurare via env)
const WEBHOOK_URL = import.meta.env.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || '';

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
    // 1. Rate limiting per IP
    const clientIP = RateLimiter.getClientIP(request);
    const ipLimit = rateLimiter.checkWithHeaders(clientIP, 'lead:ip');
    
    if (!ipLimit.allowed) {
      console.warn(`[Lead API] Rate limit exceeded for IP: ${clientIP}`);
      const response = createRateLimitResponse(ipLimit.retryAfter || 60);
      return applySecurityHeaders(response);
    }
    
    // 2. Parse body with size limit (1MB)
    const bodyResult = await parseJsonBody(request, 1024 * 1024);
    if (!bodyResult.success) {
      return applySecurityHeaders(
        new Response(
          JSON.stringify({ error: bodyResult.error, code: bodyResult.code }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    let body: unknown = bodyResult.data;
    
    // 3. Validazione Zod strict
    const parseResult = leadRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      
      const error: ApiError = {
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: { errors }
      };
      
      return new Response(
        JSON.stringify(error),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    let data: LeadRequest = parseResult.data;
    
    // XSS Prevention: Sanitize text fields
    data.name = sanitizeHtml(data.name);
    data.sintomi = sanitizeHtml(data.sintomi);
    data.durata = sanitizeHtml(data.durata);
    data.disponibilita = sanitizeHtml(data.disponibilita);
    if (data.notes) data.notes = sanitizeHtml(data.notes);
    
    // 4. Verifica duplicato (stesso telefono nelle ultime 24h)
    const existingLead = findDuplicateByPhone(data.phone);
    if (existingLead) {
      // SECURITY FIX: Masked phone number in logs to prevent PII exposure
      const maskPhone = (p: string) => p.slice(0, 6) + '****';
      console.log(`[Lead API] Duplicate lead detected for phone: ${maskPhone(data.phone)}`);
      
      const response: LeadResponse = {
        success: true,
        pazienteId: existingLead.id,
        message: 'Richiesta già registrata. Verrai contattato al più presto.'
      };
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            'X-Duplicate': 'true',
            ...ipLimit.headers
          } 
        }
      );
    }
    
    // 5. Crea paziente
    const pazienteId = `paz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const paziente: Paziente = {
      id: pazienteId,
      ...data,
      source: 'chatbot',
      createdAt: new Date()
    };
    
    // 6. Salva in memoria
    leadsStore.set(pazienteId, paziente);
    console.log(`[Lead API] Lead saved: ${pazienteId}, Total leads: ${leadsStore.size}`);
    
    // 7. Chiama webhook n8n (async, non bloccare response)
    if (WEBHOOK_URL) {
      callWebhook(paziente).catch(err => {
        console.error('[Lead API] Webhook error:', err);
      });
    } else {
      console.log('[Lead API] No webhook URL configured, skipping webhook call');
      // SECURITY FIX: Masked PII data in logs - name, phone, sintomi truncated
      const maskPhone = (p: string) => p.slice(0, 6) + '****';
      const maskName = (n: string) => n[0] + '****';
      console.log('[Lead API] Lead data:', JSON.stringify({
        id: paziente.id,
        name: maskName(paziente.name),
        phone: maskPhone(paziente.phone),
        sintomi: paziente.sintomi.slice(0, 20) + '...',
        urgenza: paziente.urgenza,
        createdAt: paziente.createdAt
      }, null, 2));
    }
    
    // 8. Prepara risposta
    const response: LeadResponse = {
      success: true,
      pazienteId,
      message: 'Richiesta inviata con successo! Verrai contattato al più presto.'
    };
    
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...getCorsHeaders(request),
      ...ipLimit.headers,
      'X-Response-Time': `${Date.now() - startTime}ms`
    });
    
    const httpResponse = new Response(JSON.stringify(response), { status: 201, headers });
    return applySecurityHeaders(httpResponse);
    
  } catch (error) {
    console.error('[Lead API] Error:', error);
    
    const errorResponse: ApiError = {
      error: 'An unexpected error occurred while processing your request',
      code: 'INTERNAL_ERROR'
    };
    
    const errorHeaders = new Headers({
      'Content-Type': 'application/json',
      ...getCorsHeaders(request),
      'X-Response-Time': `${Date.now() - startTime}ms`
    });
    
    const httpResponse = new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: errorHeaders
      }
    );
    
    return applySecurityHeaders(httpResponse);
  }
};

// Endpoint GET per listare leads (admin only)
export const GET: APIRoute = ({ request }) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  const preflight = handleCorsPreflight(request);
  if (preflight) return applySecurityHeaders(preflight);
  
  // SECURITY FIX: Admin authentication is now REQUIRED (not optional)
  const authHeader = request.headers.get('authorization');
  const adminToken = import.meta.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  
  // Reject if admin token is not configured
  if (!adminToken) {
    console.error('[Lead API] ADMIN_TOKEN not configured');
    const response = new Response(
      JSON.stringify({ error: 'Admin access not configured', code: 'NOT_CONFIGURED' }),
      { status: 503, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) } }
    );
    return applySecurityHeaders(response);
  }
  
  // Verify Bearer token
  if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
    console.warn('[Lead API] Unauthorized admin access attempt');
    const response = new Response(
      JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
      { status: 401, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request) } }
    );
    return applySecurityHeaders(response);
  }
  
  // SECURITY FIX: Rate limiting specifico per admin endpoint
  const clientIP = RateLimiter.getClientIP(request);
  const adminLimit = rateLimiter.checkWithHeaders(clientIP, 'admin:lead');
  
  if (!adminLimit.allowed) {
    console.warn(`[Lead API] Admin rate limit exceeded for IP: ${clientIP}`);
    const response = createRateLimitResponse(adminLimit.retryAfter || 60);
    return applySecurityHeaders(response);
  }
  
  // SECURITY FIX: Implement pagination
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10))); // Max 100 per page
  
  const allLeads = Array.from(leadsStore.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  const total = allLeads.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedLeads = allLeads.slice(offset, offset + limit);
  
  const response = new Response(
    JSON.stringify({ 
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      count: paginatedLeads.length,
      leads: paginatedLeads.map(l => ({
        ...l,
        createdAt: l.createdAt.toISOString()
      }))
    }),
    { 
      status: 200, 
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders(request),
        ...adminLimit.headers,
        'X-Response-Time': `${Date.now() - startTime}ms`
      } 
    }
  );
  
  return applySecurityHeaders(response);
};

// Trova duplicato per telefono (ultime 24h)
function findDuplicateByPhone(phone: string): Paziente | null {
  const normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  for (const paziente of leadsStore.values()) {
    const storedPhone = paziente.phone.replace(/[\s\-\(\)\.]/g, '');
    if (storedPhone === normalizedPhone && paziente.createdAt.getTime() > oneDayAgo) {
      return paziente;
    }
  }
  
  return null;
}

// Chiama webhook n8n
async function callWebhook(paziente: Paziente): Promise<void> {
  if (!WEBHOOK_URL) return;
  
  const payload = {
    event: 'paziente.qualified',
    data: {
      pazienteId: paziente.id,
      paziente: {
        ...paziente,
        createdAt: paziente.createdAt.toISOString()
      },
      timestamp: new Date().toISOString()
    }
  };
  
  // Genera HMAC signature
  const signature = await generateSignature(JSON.stringify(payload));
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'paziente.qualified',
        'User-Agent': 'LeadSpark-Webhook/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}`);
    }
    
    console.log(`[Lead API] Webhook called successfully for lead ${paziente.id}`);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Webhook request timeout');
    }
    throw error;
  }
}

// Genera HMAC signature
async function generateSignature(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Cleanup leads vecchi (opzionale, mantiene solo ultimi 30 giorni)
setInterval(() => {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  let cleaned = 0;
  
  leadsStore.forEach((lead, id) => {
    if (lead.createdAt.getTime() < thirtyDaysAgo) {
      leadsStore.delete(id);
      cleaned++;
    }
  });
  
  if (cleaned > 0) {
    console.log(`[Lead API] Cleaned up ${cleaned} old leads`);
  }
}, 24 * 60 * 60 * 1000); // Ogni giorno
