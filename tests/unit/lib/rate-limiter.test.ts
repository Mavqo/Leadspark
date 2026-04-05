/**
 * Unit Tests - Rate Limiter
 * Test per il sistema di rate limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimiter, createRateLimitResponse } from '../../../src/lib/rate-limiter';

// Import RateLimiter class for static method tests
const { RateLimiter } = await import('../../../src/lib/rate-limiter');

describe('RateLimiter', () => {
  beforeEach(() => {
    // Resetta lo stato del rate limiter tra i test
    rateLimiter.reset('test-ip', 'chat:ip');
    rateLimiter.reset('test-ip', 'chat:session');
    rateLimiter.reset('test-ip', 'lead:ip');
    rateLimiter.reset('test-session', 'chat:session');
    vi.clearAllMocks();
  });

  describe('check', () => {
    it('dovrebbe permettere la prima richiesta', () => {
      const result = rateLimiter.check('test-ip', 'chat:ip');
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29); // 30 - 1
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('dovrebbe permettere richieste multiple fino al limite', () => {
      const ip = 'test-ip-multiple';
      
      // Fai 30 richieste (il limite)
      for (let i = 0; i < 30; i++) {
        const result = rateLimiter.check(ip, 'chat:ip');
        expect(result.allowed).toBe(true);
      }
      
      // La 31esima dovrebbe essere bloccata
      const result = rateLimiter.check(ip, 'chat:ip');
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
    });

    it('dovrebbe resettare il contatore dopo la finestra temporale', () => {
      const ip = 'test-ip-reset';
      
      // Consuma tutte le richieste
      for (let i = 0; i < 30; i++) {
        rateLimiter.check(ip, 'chat:ip');
      }
      
      // Verifica che sia bloccato
      let result = rateLimiter.check(ip, 'chat:ip');
      expect(result.allowed).toBe(false);
      
      // Simula il passare del tempo modificando la resetTime nel storage
      const key = 'chat:ip:' + ip;
      // @ts-expect-error
      const entry = rateLimiter.storage.get(key);
      if (entry) {
        entry.resetTime = Date.now() - 1000; // Scaduto 1 secondo fa
        // @ts-expect-error
        rateLimiter.storage.set(key, entry);
      }
      
      // Ora dovrebbe essere permesso di nuovo
      result = rateLimiter.check(ip, 'chat:ip');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(29);
    });

    it('dovrebbe gestire diversi tipi di rate limiting', () => {
      const ip = 'test-ip-types';
      
      // Chat:ip ha limite 30
      const chatResult = rateLimiter.check(ip, 'chat:ip');
      expect(chatResult.remaining).toBe(29);
      
      // Lead:ip ha limite 10
      const leadResult = rateLimiter.check(ip, 'lead:ip');
      expect(leadResult.remaining).toBe(9);
      
      // Chat:session ha limite 20
      const sessionResult = rateLimiter.check('session-1', 'chat:session');
      expect(sessionResult.remaining).toBe(19);
    });

    it('dovrebbe usare il default config per tipo sconosciuto', () => {
      const result = rateLimiter.check('test-ip', 'unknown:type');
      
      expect(result.allowed).toBe(true);
      // Default: 30 maxRequests
      expect(result.remaining).toBe(29);
    });
  });

  describe('checkWithHeaders', () => {
    it('dovrebbe includere headers di rate limit', () => {
      const result = rateLimiter.checkWithHeaders('test-ip', 'chat:ip');
      
      expect(result.allowed).toBe(true);
      expect(result.headers).toBeDefined();
      expect(result.headers['X-RateLimit-Limit']).toBe('30');
      expect(result.headers['X-RateLimit-Remaining']).toBeDefined();
      expect(result.headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('dovrebbe includere Retry-After quando ilimitato', () => {
      const ip = 'test-ip-headers';
      
      // Consuma tutte le richieste
      for (let i = 0; i < 30; i++) {
        rateLimiter.check(ip, 'chat:ip');
      }
      
      const result = rateLimiter.checkWithHeaders(ip, 'chat:ip');
      
      expect(result.allowed).toBe(false);
      expect(result.headers['Retry-After']).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('getClientIP', () => {
    it('dovrebbe estrarre IP da x-forwarded-for', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      });
      
      const ip = RateLimiter.getClientIP(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('dovrebbe estrarre IP da x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '192.168.1.2'
        }
      });
      
      const ip = RateLimiter.getClientIP(request);
      expect(ip).toBe('192.168.1.2');
    });

    it('dovrebbe estrarre IP da cf-connecting-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'cf-connecting-ip': '192.168.1.3'
        }
      });
      
      const ip = RateLimiter.getClientIP(request);
      expect(ip).toBe('192.168.1.3');
    });

    it('dovrebbe generare fallback quando nessun header è presente', () => {
      const request = new Request('http://localhost', {
        headers: {
          'user-agent': 'Mozilla/5.0 Test'
        }
      });
      
      const ip = RateLimiter.getClientIP(request);
      expect(ip).toContain('fallback_');
    });

    it('dovrebbe gestire user-agent mancante', () => {
      const request = new Request('http://localhost');
      
      const ip = RateLimiter.getClientIP(request);
      expect(ip).toContain('fallback_');
    });
  });

  describe('setConfig', () => {
    it('dovrebbe permettere configurazione personalizzata', () => {
      rateLimiter.setConfig('custom:type', 60000, 100);
      
      const result = rateLimiter.check('test-ip', 'custom:type');
      expect(result.remaining).toBe(99);
    });
  });

  describe('reset', () => {
    it('dovrebbe resettare il contatore per un identificatore', () => {
      const ip = 'test-ip-reset-func';
      
      // Consuma alcune richieste
      rateLimiter.check(ip, 'chat:ip');
      rateLimiter.check(ip, 'chat:ip');
      
      // Reset
      rateLimiter.reset(ip, 'chat:ip');
      
      // Dovrebbe tornare al limite massimo
      const result = rateLimiter.check(ip, 'chat:ip');
      expect(result.remaining).toBe(29);
    });
  });

  describe('getStats', () => {
    it('dovrebbe ritornare statistiche', () => {
      // Crea alcune entry
      rateLimiter.check('ip1', 'chat:ip');
      rateLimiter.check('ip2', 'chat:ip');
      rateLimiter.check('ip3', 'lead:ip');
      
      const stats = rateLimiter.getStats();
      
      expect(stats.totalEntries).toBeGreaterThanOrEqual(3);
      expect(stats.types).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('dovrebbe pulire entry scadute', () => {
      const ip = 'test-ip-cleanup';
      
      // Crea una entry
      rateLimiter.check(ip, 'chat:ip');
      
      const key = 'chat:ip:' + ip;
      // @ts-expect-error - accesso a storage privato per test
      const entry = rateLimiter.storage.get(key);
      if (entry) {
        entry.resetTime = Date.now() - 1000; // Scaduto
        // @ts-expect-error
        rateLimiter.storage.set(key, entry);
      }
      
      // Trigger cleanup manualmente
      // @ts-expect-error
      rateLimiter.cleanup();
      
      // L'entry dovrebbe essere stata rimossa
      // @ts-expect-error
      expect(rateLimiter.storage.has(key)).toBe(false);
    });
  });
});

describe('createRateLimitResponse', () => {
  it('dovrebbe creare una response 429 con retryAfter', () => {
    const response = createRateLimitResponse(60);
    
    expect(response.status).toBe(429);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Retry-After')).toBe('60');
  });

  it('dovrebbe includere error e code nel body', async () => {
    const response = createRateLimitResponse(120);
    const body = await response.json();
    
    expect(body.error).toBeDefined();
    expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(body.retryAfter).toBe(120);
  });
});
