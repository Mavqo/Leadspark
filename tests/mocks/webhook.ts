/**
 * LeadSpark Webhook Mock
 * Mock per i webhook n8n nei test
 */

import type { WebhookEvent } from '../../src/types/paziente';

// ============================================================================
// MOCK STORAGE
// ============================================================================

/**
 * Storage in-memory per i webhook ricevuti
 */
export const webhookStore: {
  calls: Array<{
    url: string;
    payload: WebhookEvent;
    signature: string;
    timestamp: number;
  }>;
  responses: Array<{
    status: number;
    body: unknown;
  }>;
} = {
  calls: [],
  responses: []
};

// ============================================================================
// MOCK FUNCTIONS
// ============================================================================

/**
 * Mock di fetch per webhook
 */
export function mockWebhookFetch(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<Response> {
  // Salva la chiamata
  if (options.body) {
    try {
      const payload = JSON.parse(options.body);
      webhookStore.calls.push({
        url,
        payload,
        signature: options.headers?.['X-Webhook-Signature'] || '',
        timestamp: Date.now()
      });
    } catch {
      // Ignora parsing error
    }
  }
  
  // Ritorna risposta mock di successo
  const mockResponse = {
    status: 200,
    body: { received: true, processed: true }
  };
  webhookStore.responses.push(mockResponse);
  
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(mockResponse.body)
  } as Response);
}

/**
 * Genera una firma HMAC mock valida
 */
export async function generateMockSignature(payload: string, secret: string = 'test-secret'): Promise<string> {
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
 * Genera una firma HMAC invalida
 */
export function generateInvalidSignature(): string {
  return 'invalid-signature-' + Math.random().toString(36).substring(2);
}

/**
 * Reset dello storage mock
 */
export function resetWebhookStore(): void {
  webhookStore.calls = [];
  webhookStore.responses = [];
}

/**
 * Verifica se un webhook è stato chiamato
 */
export function wasWebhookCalled(eventType?: string): boolean {
  if (!eventType) return webhookStore.calls.length > 0;
  return webhookStore.calls.some(call => call.payload.event === eventType);
}

/**
 * Ottieni tutte le chiamate webhook
 */
export function getWebhookCalls(): typeof webhookStore.calls {
  return [...webhookStore.calls];
}

// ============================================================================
// VITEST MOCK SETUP
// ============================================================================

/**
 * Setup del mock per fetch globale
 */
export function setupWebhookMock() {
  const originalFetch = globalThis.fetch;
  
  beforeAll(() => {
    globalThis.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
      const urlString = url.toString();
      if (urlString.includes('webhook') || urlString.includes('n8n')) {
        return mockWebhookFetch(urlString, {
          method: init?.method,
          headers: init?.headers as Record<string, string>,
          body: init?.body as string
        });
      }
      return originalFetch(url, init);
    }) as typeof fetch;
  });
  
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });
  
  beforeEach(() => {
    resetWebhookStore();
  });
}

// Import type per Vitest
declare const vi: {
  fn: <T>(implementation: T) => T;
};
declare const beforeAll: (fn: () => void) => void;
declare const afterAll: (fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
