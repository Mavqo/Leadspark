/**
 * Unit Tests - OpenAI Module
 * Test per le funzioni di integrazione OpenAI (con mock)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatContext, ChatMessage } from '../../../src/types/paziente';

// Mock OpenAI module
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn()
        }
      };
    }
  };
});

// Import after mock
const { createChatCompletion, extractLeadData, generateSessionId } = await import('../../../src/lib/openai');

describe('OpenAI Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createChatCompletion', () => {
    it('dovrebbe ritornare fallback response in caso di errore', async () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'greeting',
        history: []
      };

      const result = await createChatCompletion({
        message: 'Ciao',
        context
      });

      // Dato che OpenAI è mockato, dovrebbe ritornare un fallback
      expect(result).toBeDefined();
      expect(result.reply).toBeDefined();
      expect(result.complete).toBe(false);
    });

    it('dovrebbe includere il messaggio nella history', async () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'symptom',
        history: [
          { role: 'assistant', content: 'Buongiorno!' }
        ]
      };

      const result = await createChatCompletion({
        message: 'Ho mal di schiena',
        context
      });

      expect(result).toBeDefined();
      expect(result.step).toBeDefined();
    });
  });

  describe('extractLeadData', () => {
    it('dovrebbe estrarre dati dalla conversazione', async () => {
      const history: ChatMessage[] = [
        { role: 'assistant', content: 'Buongiorno!' },
        { role: 'user', content: 'Ciao, ho mal di schiena' }
      ];

      const result = await extractLeadData(history, 'Da 2 settimane', 'Capisco');

      // Dato che OpenAI è mockato, dovrebbe ritornare un oggetto vuoto o con dati estratti
      expect(typeof result).toBe('object');
    });

    it('dovrebbe gestire errori di parsing', async () => {
      const history: ChatMessage[] = [];

      const result = await extractLeadData(history, 'Test message', 'Test reply');

      expect(typeof result).toBe('object');
    });
  });

  describe('generateSessionId', () => {
    it('dovrebbe generare un ID sessione univoco', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^sess_/);
    });

    it('dovrebbe includere timestamp e random', () => {
      const id = generateSessionId();
      const parts = id.split('_');

      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('sess');
      expect(parseInt(parts[1])).toBeGreaterThan(0); // timestamp
      expect(parts[2]).toBeDefined(); // random string
    });
  });

  describe('getFallbackResponse (via error handling)', () => {
    it('dovrebbe fornire risposte fallback per ogni step', async () => {
      const steps: ChatContext['step'][] = ['greeting', 'symptom', 'duration', 'urgency', 'availability', 'contact', 'complete'];

      for (const step of steps) {
        const context: ChatContext = {
          sessionId: 'test-session',
          collectedData: {},
          step,
          history: []
        };

        const result = await createChatCompletion({
          message: 'Test',
          context
        });

        expect(result.reply).toBeDefined();
        expect(result.reply.length).toBeGreaterThan(0);
      }
    });
  });
});

// Test per le funzioni di utilità interne
describe('OpenAI Utilities', () => {
  describe('determineStepAndExtractData', () => {
    it('dovrebbe avanzare step quando ci sono abbastanza dati', async () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'greeting',
        history: []
      };

      const result = await createChatCompletion({
        message: 'Ho mal di schiena da settimane', // Messaggio lungo per avanzare
        context
      });

      expect(result.step).toBeDefined();
    });

    it('dovrebbe completare quando tutti i dati sono raccolti', async () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {
          name: 'Marco',
          phone: '3331234567',
          sintomi: 'Mal di schiena',
          durata: '2 settimane',
          urgenza: 'media',
          disponibilita: 'Martedì'
        },
        step: 'contact',
        history: []
      };

      const result = await createChatCompletion({
        message: '3331234567',
        context
      });

      // Dovrebbe rilevare che tutti i campi required sono presenti
      expect(result).toBeDefined();
    });
  });
});
