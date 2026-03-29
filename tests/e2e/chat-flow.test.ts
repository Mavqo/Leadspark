/**
 * LeadSpark E2E Test - Chat Flow
 * Test completo del flusso conversazionale del chatbot
 * 
 * @description Verifica il flusso end-to-end della conversazione:
 * 1. Greeting iniziale
 * 2. Raccolta sintomi
 * 3. Raccolta durata
 * 4. Valutazione urgenza
 * 5. Raccolta contatti (nome + telefono)
 * 6. Raccolta disponibilità
 * 7. Completamento lead
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { POST as chatHandler } from '../../src/pages/api/chat';
import { POST as leadHandler } from '../../src/pages/api/lead';
import type { ChatResponse, LeadResponse, Paziente } from '../../src/types/paziente';

// ============================================================================
// MOCKS
// ============================================================================

// Mock OpenAI
vi.mock('../../src/lib/openai', () => ({
  createChatCompletion: vi.fn(({ message, context }) => {
    const step = context.step || 'greeting';
    const responses: Record<string, () => ChatResponse> = {
      greeting: () => ({
        reply: "Buongiorno! Sono Emma, l'assistente virtuale del Centro Fisioterapia. Come posso aiutarla oggi?",
        step: 'symptom',
        complete: false,
        leadData: {}
      }),
      symptom: () => ({
        reply: "Mi dispiace sentirlo. Da quanto tempo ha questo dolore?",
        step: 'duration',
        complete: false,
        leadData: { sintomi: message }
      }),
      duration: () => ({
        reply: "Capisco. Riesce a muoversi normalmente o ha difficoltà? Come descriverebbe l'intensità del dolore?",
        step: 'urgency',
        complete: false,
        leadData: { durata: message }
      }),
      urgency: () => ({
        reply: "Grazie per queste informazioni. Per completare la richiesta, potrebbe darmi il suo nome?",
        step: 'contact',
        complete: false,
        leadData: { urgenza: 'media' }
      }),
      contact: () => {
        const isPhone = /\d{7,}/.test(message.replace(/\s/g, ''));
        if (!isPhone) {
          return {
            reply: "Grazie! Ora mi serve il suo numero di telefono per poterla ricontattare.",
            step: 'contact',
            complete: false,
            leadData: { name: message }
          };
        }
        return {
          reply: "Perfetto. Quando sarebbe disponibile per un appuntamento? Preferisce mattina o pomeriggio?",
          step: 'availability',
          complete: false,
          leadData: { phone: message.replace(/\s/g, '') }
        };
      },
      availability: () => ({
        reply: "Perfetto! Ho raccolto tutte le informazioni necessarie. La contatteremo al numero fornito per confermare l'appuntamento. C'è altro che posso fare per lei?",
        step: 'complete',
        complete: true,
        leadData: { disponibilita: message }
      }),
      complete: () => ({
        reply: "Grazie per averci contattato! Un nostro operatore ti ricontatterà al più presto. Buona giornata!",
        step: 'complete',
        complete: true,
        leadData: {}
      })
    };
    
    const handler = responses[step] || responses.greeting;
    const response = handler();
    
    // Merge con dati già raccolti
    return Promise.resolve({
      ...response,
      leadData: { ...context.collectedData, ...response.leadData }
    });
  }),
  generateSessionId: vi.fn(() => `test-sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`)
}));

// Mock rate limiter per evitare blocchi nei test
vi.mock('../../src/lib/rate-limiter', () => ({
  rateLimiter: {
    checkWithHeaders: vi.fn(() => ({
      allowed: true,
      headers: {
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': '29',
        'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60)
      }
    })),
    check: vi.fn(() => ({ allowed: true, remaining: 29, resetTime: Date.now() + 60000 }))
  },
  createRateLimitResponse: vi.fn((retryAfter: number) => 
    new Response(
      JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', retryAfter }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) } }
    )
  )
}));

// ============================================================================
// TEST SUITE
// ============================================================================

describe('E2E Chat Flow', () => {
  let sessionId: string;
  let collectedData: Record<string, unknown> = {};
  let currentStep = 'greeting';
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  beforeEach(() => {
    sessionId = `test-sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    collectedData = {};
    currentStep = 'greeting';
    history.length = 0;
  });

  // ============================================================================
  // STEP 1: GREETING
  // ============================================================================
  
  describe('Step 1: Greeting', () => {
    it('dovrebbe rispondere al saluto iniziale', async () => {
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Ciao',
          sessionId,
          context: { step: currentStep, collectedData, history }
        })
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.reply).toContain('Buongiorno');
      expect(data.reply).toContain('Emma');
      expect(data.step).toBe('symptom');
      expect(data.complete).toBe(false);
      
      // Update context for next step
      currentStep = data.step || 'symptom';
      history.push({ role: 'user', content: 'Ciao' });
      history.push({ role: 'assistant', content: data.reply });
    });
  });

  // ============================================================================
  // STEP 2: RACCOLTA SINTOMI
  // ============================================================================
  
  describe('Step 2: Symptom Collection', () => {
    it('dovrebbe raccogliere i sintomi del paziente', async () => {
      currentStep = 'symptom';
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Mal di schiena',
          sessionId,
          context: { step: currentStep, collectedData, history }
        })
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.reply).toContain('dispiace');
      expect(data.reply.toLowerCase()).toMatch(/quanto tempo|durata/);
      expect(data.step).toBe('duration');
      expect(data.leadData?.sintomi).toBe('Mal di schiena');
      
      collectedData = { ...collectedData, ...data.leadData };
      currentStep = data.step || 'duration';
      history.push({ role: 'user', content: 'Mal di schiena' });
      history.push({ role: 'assistant', content: data.reply });
    });
  });

  // ============================================================================
  // STEP 3: RACCOLTA DURATA
  // ============================================================================
  
  describe('Step 3: Duration Collection', () => {
    it('dovrebbe raccogliere la durata dei sintomi', async () => {
      currentStep = 'duration';
      collectedData = { sintomi: 'Mal di schiena' };
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '2 settimane',
          sessionId,
          context: { step: currentStep, collectedData, history }
        })
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.step).toBe('urgency');
      expect(data.leadData?.durata).toBe('2 settimane');
      
      collectedData = { ...collectedData, ...data.leadData };
      currentStep = data.step || 'urgency';
      history.push({ role: 'user', content: '2 settimane' });
      history.push({ role: 'assistant', content: data.reply });
    });
  });

  // ============================================================================
  // STEP 4: VALUTAZIONE URGENZA
  // ============================================================================
  
  describe('Step 4: Urgency Assessment', () => {
    it('dovrebbe valutare il livello di urgenza', async () => {
      currentStep = 'urgency';
      collectedData = { sintomi: 'Mal di schiena', durata: '2 settimane' };
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Dolore moderato',
          sessionId,
          context: { step: currentStep, collectedData, history }
        })
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.reply.toLowerCase()).toContain('nome');
      expect(data.step).toBe('contact');
      expect(data.leadData?.urgenza).toBe('media');
      
      collectedData = { ...collectedData, ...data.leadData };
      currentStep = data.step || 'contact';
      history.push({ role: 'user', content: 'Dolore moderato' });
      history.push({ role: 'assistant', content: data.reply });
    });
  });

  // ============================================================================
  // STEP 5: RACCOLTA CONTATTI - NOME
  // ============================================================================
  
  describe('Step 5a: Contact Collection - Name', () => {
    it('dovrebbe raccogliere il nome del paziente', async () => {
      currentStep = 'contact';
      collectedData = { sintomi: 'Mal di schiena', durata: '2 settimane', urgenza: 'media' };
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Marco',
          sessionId,
          context: { step: currentStep, collectedData, history }
        })
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.reply.toLowerCase()).toContain('telefono');
      expect(data.leadData?.name).toBe('Marco');
      
      collectedData = { ...collectedData, ...data.leadData };
      history.push({ role: 'user', content: 'Marco' });
      history.push({ role: 'assistant', content: data.reply });
    });
  });

  // ============================================================================
  // STEP 5: RACCOLTA CONTATTI - TELEFONO
  // ============================================================================
  
  describe('Step 5b: Contact Collection - Phone', () => {
    it('dovrebbe raccogliere il telefono del paziente', async () => {
      currentStep = 'contact';
      collectedData = { sintomi: 'Mal di schiena', durata: '2 settimane', urgenza: 'media', name: 'Marco' };
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '3331234567',
          sessionId,
          context: { step: currentStep, collectedData, history }
        })
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.reply.toLowerCase()).toMatch(/disponibile|appuntamento|mattina|pomeriggio/);
      expect(data.step).toBe('availability');
      expect(data.leadData?.phone).toBe('3331234567');
      
      collectedData = { ...collectedData, ...data.leadData };
      currentStep = data.step || 'availability';
      history.push({ role: 'user', content: '3331234567' });
      history.push({ role: 'assistant', content: data.reply });
    });
  });

  // ============================================================================
  // STEP 6: RACCOLTA DISPONIBILITÀ
  // ============================================================================
  
  describe('Step 6: Availability Collection', () => {
    it('dovrebbe raccogliere la disponibilità e completare il flusso', async () => {
      currentStep = 'availability';
      collectedData = { 
        sintomi: 'Mal di schiena', 
        durata: '2 settimane', 
        urgenza: 'media', 
        name: 'Marco',
        phone: '3331234567'
      };
      
      const request = new Request('http://localhost/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Martedì pomeriggio',
          sessionId,
          context: { step: currentStep, collectedData, history }
        })
      });

      const response = await chatHandler({ request } as any);
      const data = await response.json() as ChatResponse;

      expect(response.status).toBe(200);
      expect(data.reply.toLowerCase()).toContain('perfetto');
      expect(data.step).toBe('complete');
      expect(data.complete).toBe(true);
      expect(data.leadData?.disponibilita).toBe('Martedì pomeriggio');
      
      collectedData = { ...collectedData, ...data.leadData };
      history.push({ role: 'user', content: 'Martedì pomeriggio' });
      history.push({ role: 'assistant', content: data.reply });
    });
  });

  // ============================================================================
  // STEP 7: SALVATAGGIO LEAD
  // ============================================================================
  
  describe('Step 7: Lead Submission', () => {
    it('dovrebbe salvare il lead correttamente', async () => {
      const leadData = {
        name: 'Marco',
        phone: '3331234567',
        email: 'marco@example.com',
        sintomi: 'Mal di schiena',
        durata: '2 settimane',
        urgenza: 'media' as const,
        disponibilita: 'Martedì pomeriggio',
        source: 'chatbot' as const,
        sessionId
      };
      
      const request = new Request('http://localhost/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData)
      });

      const response = await leadHandler({ request } as any);
      const data = await response.json() as LeadResponse;

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.pazienteId).toBeDefined();
      expect(data.pazienteId).toMatch(/^paz_/);
      expect(data.message).toContain('successo');
    });
  });

  // ============================================================================
  // FLUSSO COMPLETO INTEGRATO
  // ============================================================================
  
  describe('Flusso Completo Integrato', () => {
    it('dovrebbe completare l\'intera conversazione e salvare il lead', async () => {
      const testSessionId = `e2e-sess-${Date.now()}`;
      const conversation: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      let step = 'greeting';
      let collected: Record<string, unknown> = {};

      // Step 1: Greeting
      let response = await chatHandler({
        request: new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Ciao',
            sessionId: testSessionId,
            context: { step, collectedData: collected, history: conversation }
          })
        })
      } as any);
      let data = await response.json() as ChatResponse;
      expect(response.status).toBe(200);
      expect(data.reply).toContain('Buongiorno');
      step = data.step || 'symptom';
      conversation.push({ role: 'user', content: 'Ciao' });
      conversation.push({ role: 'assistant', content: data.reply });

      // Step 2: Sintomi
      response = await chatHandler({
        request: new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Mal di schiena',
            sessionId: testSessionId,
            context: { step, collectedData: collected, history: conversation }
          })
        })
      } as any);
      data = await response.json() as ChatResponse;
      expect(data.step).toBe('duration');
      collected = { ...collected, ...data.leadData };
      step = data.step || 'duration';
      conversation.push({ role: 'user', content: 'Mal di schiena' });
      conversation.push({ role: 'assistant', content: data.reply });

      // Step 3: Durata
      response = await chatHandler({
        request: new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '2 settimane',
            sessionId: testSessionId,
            context: { step, collectedData: collected, history: conversation }
          })
        })
      } as any);
      data = await response.json() as ChatResponse;
      expect(data.step).toBe('urgency');
      collected = { ...collected, ...data.leadData };
      step = data.step || 'urgency';
      conversation.push({ role: 'user', content: '2 settimane' });
      conversation.push({ role: 'assistant', content: data.reply });

      // Step 4: Urgenza
      response = await chatHandler({
        request: new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Dolore moderato',
            sessionId: testSessionId,
            context: { step, collectedData: collected, history: conversation }
          })
        })
      } as any);
      data = await response.json() as ChatResponse;
      expect(data.step).toBe('contact');
      collected = { ...collected, ...data.leadData };
      step = data.step || 'contact';
      conversation.push({ role: 'user', content: 'Dolore moderato' });
      conversation.push({ role: 'assistant', content: data.reply });

      // Step 5a: Nome
      response = await chatHandler({
        request: new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Marco',
            sessionId: testSessionId,
            context: { step, collectedData: collected, history: conversation }
          })
        })
      } as any);
      data = await response.json() as ChatResponse;
      collected = { ...collected, ...data.leadData };
      step = data.step || 'contact';
      conversation.push({ role: 'user', content: 'Marco' });
      conversation.push({ role: 'assistant', content: data.reply });

      // Step 5b: Telefono
      response = await chatHandler({
        request: new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '3331234567',
            sessionId: testSessionId,
            context: { step, collectedData: collected, history: conversation }
          })
        })
      } as any);
      data = await response.json() as ChatResponse;
      expect(data.step).toBe('availability');
      collected = { ...collected, ...data.leadData };
      step = data.step || 'availability';
      conversation.push({ role: 'user', content: '3331234567' });
      conversation.push({ role: 'assistant', content: data.reply });

      // Step 6: Disponibilità
      response = await chatHandler({
        request: new Request('http://localhost/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Martedì pomeriggio',
            sessionId: testSessionId,
            context: { step, collectedData: collected, history: conversation }
          })
        })
      } as any);
      data = await response.json() as ChatResponse;
      expect(data.step).toBe('complete');
      expect(data.complete).toBe(true);
      collected = { ...collected, ...data.leadData };

      // Step 7: Salva lead
      const leadResponse = await leadHandler({
        request: new Request('http://localhost/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: collected.name,
            phone: collected.phone,
            email: 'marco@test.com',
            sintomi: collected.sintomi,
            durata: collected.durata,
            urgenza: collected.urgenza,
            disponibilita: collected.disponibilita
          })
        })
      } as any);
      const leadData = await leadResponse.json() as LeadResponse;
      expect(leadResponse.status).toBe(201);
      expect(leadData.success).toBe(true);
      expect(leadData.pazienteId).toBeDefined();
    });
  });
});
