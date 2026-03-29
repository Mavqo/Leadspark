import type { APIRoute } from 'astro';
import { z } from 'zod';
import { rateLimiter, createRateLimitResponse } from '../../lib/rate-limiter';
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

// Webhook URL (da configurare via env)
const WEBHOOK_URL = import.meta.env.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL || '';

// SECURITY FIX: Removed hardcoded default secret - now throws if not configured
const WEBHOOK_SECRET = import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  throw new Error('WEBHOOK_SECRET environment variable is required');
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting per IP
    const clientIP = rateLimiter.constructor.getClientIP(request);
    const ipLimit = rateLimiter.checkWithHeaders(clientIP, 'lead:ip');
    
    if (!ipLimit.allowed) {
      console.warn(`[Lead API] Rate limit exceeded for IP: ${clientIP}`);
      return createRateLimitResponse(ipLimit.retryAfter || 60);
    }
    
    // 2. Parse body
    let body: unknown;
    try {
      body = await request.json();
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
    
    const data: LeadRequest = parseResult.data;
    
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
      ...ipLimit.headers,
      'X-Response-Time': `${Date.now() - startTime}ms`
    });
    
    return new Response(JSON.stringify(response), { status: 201, headers });
    
  } catch (error) {
    console.error('[Lead API] Error:', error);
    
    const errorResponse: ApiError = {
      error: 'An unexpected error occurred while processing your request',
      code: 'INTERNAL_ERROR'
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Response-Time': `${Date.now() - startTime}ms`
        } 
      }
    );
  }
};

// Endpoint GET per listare leads (admin/debug)
export const GET: APIRoute = ({ request }) => {
  // Simple auth check (in produzione usare JWT o session)
  const authHeader = request.headers.get('authorization');
  const adminToken = import.meta.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  
  if (adminToken && authHeader !== `Bearer ${adminToken}`) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const leads = Array.from(leadsStore.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  
  return new Response(
    JSON.stringify({ 
      count: leads.length,
      leads: leads.map(l => ({
        ...l,
        createdAt: l.createdAt.toISOString()
      }))
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
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
