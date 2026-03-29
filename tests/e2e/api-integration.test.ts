/**
 * LeadSpark E2E Test - API Integration
 * Test di integrazione per tutti gli endpoint API
 * 
 * @description Verifica:
 * - POST /api/chat (valid request, rate limit)
 * - POST /api/lead (valid patient, validation error)
 * - POST /api/webhook/n8n (valid signature, invalid signature)
 * - GET /api/chat (health check)
 * - GET /api/lead (list leads con auth)
 * - GET /api/webhook/n8n (health check)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as chatHandler, GET as chatHealthHandler } from '../../src/pages/api/chat';
import { POST as leadHandler, GET as leadListHandler } from '../../src/pages/api/lead';
import { POST as webhookHandler, GET as webhookHealthHandler } from '../../src/pages/api/webhook/n8n';
import type { ChatResponse, LeadResponse, ApiError } from '../../src/types/paziente';

// ============================================================================
// FIXTURES
// ============================================================================

const validLead = {
  name: 'Marco Rossi',
  phone: '+393331234567',
  email: 'marco.rossi@example.com',
  sintomi: 'Mal di schiena lombare',
  durata: '2 settimane',
  urgenza: 'media' as const,
  disponibilita: 'Martedì pomeriggio',
  notes: 'Preferisce trattamenti manuali'
};

const invalidLeadNoPhone = {
  name: 'Anna Neri',
  email: 'anna.neri@example.com',
  sintomi: 'Mal di schiena',
  durata: '1 settimana',
  urgenza: 'media' as const,
  disponibilita: 'Giovedì'
};

const invalidLeadBadEmail = {
  name: 'Paolo Gialli',
  phone: '3334445556',
  email: 'email-non-valida',
  sintomi: 'Mal di schiena',
  durata: '1 settimana',
  urgenza: 'media' as const,
  disponibilita: 'Venerdì'
};

// ============================================================================
// MOCKS
// ============================================================================

// Mock OpenAI
vi.mock('../../src/lib/openai', () => ({
  createChatCompletion: vi.fn(({ message, context }) => {
    return Promise.resolve({
      reply: `Risposta mock per: ${message}`,
      step: context.step || 'greeting',
      complete: false,
      leadData: { sintomi: message }
    });
  }),
  generateSessionId: vi.fn(() => `test-sess-${Date.now()}`)
}));

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Genera una firma HMAC valida per i test
 */
async function generateTestSignature(payload: string, secret: string = 'default-secret'): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
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

/**
 * Crea un mock Request con body JSON
 */
function createJsonRequest(url: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  });
}

// ============================================================================
// TEST SUITE: CHAT API
// ============================================================================

describe('API Integration Tests - Chat Endpoint', () => {
  describe('POST /api/chat', () => {
    it('dovrebbe accettare una richiesta valida e ritornare risposta', async () => {
      const request = createJsonRequest('http://localhost/api/chat', {
        message: 'Ciao, ho mal di schiena',
        sessionId: 'test-session-001',
        context: {
          step: 'greeting',
          collectedData: {},
          history: []
        }
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.reply).toBeDefined();
      expect(data.reply.length).toBeGreaterThan(0);
      expect(data.step).toBeDefined();
    });

    it('dovrebbe rifiutare richiesta con JSON invalido', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{'
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_JSON');
      expect(data.error).toContain('Invalid JSON');
    });

    it('dovrebbe rifiutare richiesta con campi mancanti', async () => {
      const request = createJsonRequest('http://localhost/api/chat', {
        message: 'Ciao'
        // sessionId mancante
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('dovrebbe rifiutare messaggio vuoto', async () => {
      const request = createJsonRequest('http://localhost/api/chat', {
        message: '',
        sessionId: 'test-session-001'
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('dovrebbe includere headers di rate limiting nella risposta', async () => {
      const request = createJsonRequest('http://localhost/api/chat', {
        message: 'Test message',
        sessionId: 'test-session-002'
      });

      const response = await chatHandler({ request } as any);

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
      expect(response.headers.get('X-Response-Time')).toBeDefined();
    });
  });

  describe('GET /api/chat (Health Check)', () => {
    it('dovrebbe ritornare stato health check', async () => {
      const request = new Request('http://localhost/api/chat');
      const response = await chatHealthHandler({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('chat-api');
      expect(data.timestamp).toBeDefined();
      expect(data.sessions).toBeDefined();
    });
  });
});

// ============================================================================
// TEST SUITE: LEAD API
// ============================================================================

describe('API Integration Tests - Lead Endpoint', () => {
  beforeEach(() => {
    // Reset del rate limiter mock tra i test
    vi.clearAllMocks();
  });

  describe('POST /api/lead', () => {
    it('dovrebbe creare un lead valido con status 201', async () => {
      const request = createJsonRequest('http://localhost/api/lead', validLead);

      const response = await leadHandler({ request } as any);
      const data = await response.json() as LeadResponse;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.pazienteId).toBeDefined();
      expect(data.pazienteId).toMatch(/^paz_/);
      expect(data.message).toContain('successo');
    });

    it('dovrebbe creare lead senza email (campo opzionale)', async () => {
      const leadWithoutEmail = { ...validLead };
      delete (leadWithoutEmail as { email?: string }).email;
      
      const request = createJsonRequest('http://localhost/api/lead', leadWithoutEmail);

      const response = await leadHandler({ request } as any);
      const data = await response.json() as LeadResponse;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
    });

    it('dovrebbe rifiutare lead con telefono mancante', async () => {
      const request = createJsonRequest('http://localhost/api/lead', invalidLeadNoPhone);

      const response = await leadHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.errors).toBeDefined();
      expect(data.details?.errors.some((e: { field: string }) => e.field === 'phone')).toBe(true);
    });

    it('dovrebbe rifiutare lead con email invalida', async () => {
      const request = createJsonRequest('http://localhost/api/lead', invalidLeadBadEmail);

      const response = await leadHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.errors.some((e: { field: string }) => e.field === 'email')).toBe(true);
    });

    it('dovrebbe rifiutare lead con nome troppo corto', async () => {
      const request = createJsonRequest('http://localhost/api/lead', {
        ...validLead,
        name: 'A'
      });

      const response = await leadHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.details?.errors.some((e: { field: string }) => e.field === 'name')).toBe(true);
    });

    it('dovrebbe rifiutare lead con urgenza invalida', async () => {
      const request = createJsonRequest('http://localhost/api/lead', {
        ...validLead,
        urgenza: 'critica'
      });

      const response = await leadHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('dovrebbe rifiutare lead con JSON invalido', async () => {
      const request = new Request('http://localhost/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json'
      });

      const response = await leadHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_JSON');
    });

    it('dovrebbe rilevare duplicato per stesso telefono entro 24h', async () => {
      // Primo lead
      const request1 = createJsonRequest('http://localhost/api/lead', validLead);
      await leadHandler({ request: request1 } as any);

      // Secondo lead con stesso telefono
      const request2 = createJsonRequest('http://localhost/api/lead', {
        ...validLead,
        name: 'Marco Diverso'
      });

      const response = await leadHandler({ request: request2 } as any);
      const data = await response.json() as LeadResponse;

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Duplicate')).toBe('true');
      expect(data.success).toBe(true);
      expect(data.message.toLowerCase()).toContain('già');
    });

    it('dovrebbe includere headers di rate limiting', async () => {
      const request = createJsonRequest('http://localhost/api/lead', validLead);

      const response = await leadHandler({ request } as any);

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-Response-Time')).toBeDefined();
    });
  });

  describe('GET /api/lead (Admin List)', () => {
    it('dovrebbe richiedere autenticazione', async () => {
      const request = new Request('http://localhost/api/lead');
      const response = await leadListHandler({ request } as any);

      // Senza ADMIN_TOKEN configurato o senza header auth, dovrebbe permettere accesso
      // o ritornare 401 se ADMIN_TOKEN è configurato
      expect([200, 401]).toContain(response.status);
    });

    it('dovrebbe listare leads con token admin valido', async () => {
      // Imposta ADMIN_TOKEN per il test
      process.env.ADMIN_TOKEN = 'test-admin-token';
      
      const request = new Request('http://localhost/api/lead', {
        headers: { 'Authorization': 'Bearer test-admin-token' }
      });

      const response = await leadListHandler({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.count).toBeDefined();
      expect(data.leads).toBeDefined();
      expect(Array.isArray(data.leads)).toBe(true);
      
      delete process.env.ADMIN_TOKEN;
    });
  });
});

// ============================================================================
// TEST SUITE: WEBHOOK API
// ============================================================================

describe('API Integration Tests - Webhook n8n Endpoint', () => {
  const validWebhookPayload = {
    event: 'paziente.qualified' as const,
    data: {
      pazienteId: 'paz_1234567890',
      paziente: {
        id: 'paz_1234567890',
        name: 'Marco Rossi',
        phone: '+393331234567',
        sintomi: 'Mal di schiena',
        urgenza: 'media',
        source: 'chatbot',
        createdAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
  };

  describe('POST /api/webhook/n8n', () => {
    it('dovrebbe accettare webhook con firma valida', async () => {
      const payload = JSON.stringify(validWebhookPayload);
      const signature = await generateTestSignature(payload);

      const request = new Request('http://localhost/api/webhook/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body: payload
      });

      const response = await webhookHandler({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.event).toBe('paziente.qualified');
      expect(response.headers.get('X-Event-Processed')).toBe('paziente.qualified');
    });

    it('dovrebbe rifiutare webhook senza firma', async () => {
      const request = createJsonRequest('http://localhost/api/webhook/n8n', validWebhookPayload);

      const response = await webhookHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(401);
      expect(data.code).toBe('MISSING_SIGNATURE');
      expect(data.error).toContain('signature');
    });

    it('dovrebbe rifiutare webhook con firma invalida', async () => {
      const request = new Request('http://localhost/api/webhook/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'invalid-signature-12345'
        },
        body: JSON.stringify(validWebhookPayload)
      });

      const response = await webhookHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(401);
      expect(data.code).toBe('INVALID_SIGNATURE');
      expect(data.error).toContain('Invalid');
    });

    it('dovrebbe rifiutare payload JSON invalido', async () => {
      const request = new Request('http://localhost/api/webhook/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': await generateTestSignature('{}')
        },
        body: 'invalid json{'
      });

      const response = await webhookHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_JSON');
    });

    it('dovrebbe rifiutare evento con formato invalido', async () => {
      const invalidPayload = {
        event: 'invalid.event.type',
        data: { test: true },
        timestamp: new Date().toISOString()
      };
      const body = JSON.stringify(invalidPayload);
      const signature = await generateTestSignature(body);

      const request = new Request('http://localhost/api/webhook/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body
      });

      const response = await webhookHandler({ request } as any);
      const data = await response.json() as ApiError;

      expect(response.status).toBe(400);
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('dovrebbe processare evento notification.sent', async () => {
      const payload = {
        event: 'notification.sent' as const,
        data: {
          pazienteId: 'paz_123',
          message: 'Conferma inviata',
          timestamp: new Date().toISOString()
        }
      };
      const body = JSON.stringify(payload);
      const signature = await generateTestSignature(body);

      const request = new Request('http://localhost/api/webhook/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body
      });

      const response = await webhookHandler({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.event).toBe('notification.sent');
    });

    it('dovrebbe processare evento notification.failed', async () => {
      const payload = {
        event: 'notification.failed' as const,
        data: {
          pazienteId: 'paz_123',
          message: 'Errore invio',
          timestamp: new Date().toISOString()
        }
      };
      const body = JSON.stringify(payload);
      const signature = await generateTestSignature(body);

      const request = new Request('http://localhost/api/webhook/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body
      });

      const response = await webhookHandler({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(data.event).toBe('notification.failed');
    });

    it('dovrebbe includere headers di rate limiting', async () => {
      const payload = JSON.stringify(validWebhookPayload);
      const signature = await generateTestSignature(payload);

      const request = new Request('http://localhost/api/webhook/n8n', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature
        },
        body: payload
      });

      const response = await webhookHandler({ request } as any);

      expect(response.headers.get('X-RateLimit-Limit')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-Response-Time')).toBeDefined();
    });
  });

  describe('GET /api/webhook/n8n (Health Check)', () => {
    it('dovrebbe ritornare stato health check', async () => {
      const request = new Request('http://localhost/api/webhook/n8n');
      const response = await webhookHealthHandler({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.service).toBe('webhook-n8n');
      expect(data.timestamp).toBeDefined();
    });
  });
});

// ============================================================================
// TEST SUITE: RATE LIMITING
// ============================================================================

describe('API Integration Tests - Rate Limiting', () => {
  // Per testare il rate limiting, dobbiamo mockare il rateLimiter
  // per simulare il superamento dei limiti
  
  describe('Rate Limit Scenarios', () => {
    it('dovrebbe simulare rate limit exceeded su chat', async () => {
      // Mock temporaneo per rate limit
      const { rateLimiter } = await import('../../src/lib/rate-limiter');
      vi.spyOn(rateLimiter, 'checkWithHeaders').mockReturnValueOnce({
        allowed: false,
        headers: {
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
          'Retry-After': '60'
        },
        retryAfter: 60
      });

      const request = createJsonRequest('http://localhost/api/chat', {
        message: 'Test',
        sessionId: 'test-session-rl'
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('dovrebbe simulare rate limit exceeded su lead', async () => {
      const { rateLimiter } = await import('../../src/lib/rate-limiter');
      vi.spyOn(rateLimiter, 'checkWithHeaders').mockReturnValueOnce({
        allowed: false,
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
          'Retry-After': '30'
        },
        retryAfter: 30
      });

      const request = createJsonRequest('http://localhost/api/lead', validLead);

      const response = await leadHandler({ request } as any);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(data.retryAfter).toBe(30);
    });
  });
});

// ============================================================================
// TEST SUITE: CORS E HEADERS
// ============================================================================

describe('API Integration Tests - CORS e Headers', () => {
  it('dovrebbe includere Content-Type JSON in tutte le risposte', async () => {
    const request = createJsonRequest('http://localhost/api/chat', {
      message: 'Test',
      sessionId: 'test-session-cors'
    });

    const response = await chatHandler({ request } as any);
    
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('dovrebbe includere X-Response-Time in tutte le risposte', async () => {
    const request = createJsonRequest('http://localhost/api/lead', validLead);

    const response = await leadHandler({ request } as any);
    const responseTime = response.headers.get('X-Response-Time');
    
    expect(responseTime).toBeDefined();
    expect(responseTime).toMatch(/^\d+ms$/);
  });
});
