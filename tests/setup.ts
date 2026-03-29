/**
 * LeadSpark Test Setup
 * Configurazione globale per Vitest
 */

import { vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

// Mock delle variabili d'ambiente
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.WEBHOOK_SECRET = 'test-webhook-secret';
process.env.N8N_WEBHOOK_URL = 'https://n8n.test/webhook/test';
process.env.ADMIN_TOKEN = 'test-admin-token';

// ============================================================================
// CRYPTO MOCK (per ambienti senza Web Crypto API completa)
// ============================================================================

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  // Polyfill minimale per Web Crypto API
  const mockCrypto = {
    subtle: {
      importKey: vi.fn(() => Promise.resolve({} as CryptoKey)),
      sign: vi.fn(() => 
        Promise.resolve(new Uint8Array(32).buffer as ArrayBuffer)
      ),
      verify: vi.fn(() => Promise.resolve(true))
    },
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
  };
  
  Object.defineProperty(globalThis, 'crypto', {
    value: mockCrypto,
    writable: true,
    configurable: true
  });
}

// ============================================================================
// CONSOLE MOCK (opzionale - decommenta per ridurre noise)
// ============================================================================

// Silenzia console durante i test (opzionale)
// global.console = {
//   ...console,
//   log: vi.fn(),
//   debug: vi.fn(),
//   info: vi.fn(),
//   // Mantieni error e warn per debugging
//   error: console.error,
//   warn: console.warn,
// };

// ============================================================================
// FETCH MOCK HELPER
// ============================================================================

// Salva fetch originale
const originalFetch = globalThis.fetch;

// Mock fetch per webhook
beforeEach(() => {
  globalThis.fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlString = url.toString();
    
    // Mock webhook n8n
    if (urlString.includes('n8n.test') || urlString.includes('webhook')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ received: true, processed: true }),
        text: async () => 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' })
      } as Response;
    }
    
    // Per altre chiamate, usa fetch originale
    return originalFetch(url, init);
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ============================================================================
// CLEANUP
// ============================================================================

afterEach(() => {
  // Pulisce tutti i mock tra i test
  vi.clearAllMocks();
});

// ============================================================================
// MATCHERS CUSTOM (opzionali)
// ============================================================================

// Esempio di matcher custom
expect.extend({
  toBeValidPazienteId(received: string) {
    const pass = /^paz_\d+_[a-z0-9]+$/.test(received);
    return {
      message: () => `expected ${received} to be a valid paziente ID`,
      pass
    };
  }
});

// ============================================================================
// TYPE DECLARATIONS
// ============================================================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface Assertion<T = unknown> {
      toBeValidPazienteId(): T;
    }
  }
}

export {};
