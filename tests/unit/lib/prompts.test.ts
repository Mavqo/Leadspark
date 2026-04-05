/**
 * Unit Tests - Prompts Module
 * Test per la generazione dei prompt di sistema
 */

import { describe, it, expect } from 'vitest';
import { 
  SYSTEM_PROMPT, 
  EXTRACTION_PROMPT, 
  buildConversationPrompt, 
  buildExtractionPrompt 
} from '../../../src/lib/prompts';
import type { ChatContext, ChatStep } from '../../../src/types/paziente';

describe('Prompts Module', () => {
  describe('SYSTEM_PROMPT', () => {
    it('dovrebbe essere definito e non vuoto', () => {
      expect(SYSTEM_PROMPT).toBeDefined();
      expect(SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('dovrebbe includere il nome Emma', () => {
      expect(SYSTEM_PROMPT).toContain('Emma');
    });

    it('dovrebbe includere il flow conversazionale', () => {
      expect(SYSTEM_PROMPT).toContain('FLOW CONVERSAZIONALE');
      expect(SYSTEM_PROMPT).toContain('SALUTO');
      expect(SYSTEM_PROMPT).toContain('SINTOMI');
      expect(SYSTEM_PROMPT).toContain('CONTATTI');
    });

    it('dovrebbe includere regole importanti', () => {
      expect(SYSTEM_PROMPT).toContain('REGOLE IMPORTANTI');
    });

    it('dovrebbe specificare di non fornire diagnosi', () => {
      expect(SYSTEM_PROMPT).toContain('NON fornire mai diagnosi');
    });
  });

  describe('EXTRACTION_PROMPT', () => {
    it('dovrebbe essere definito e non vuoto', () => {
      expect(EXTRACTION_PROMPT).toBeDefined();
      expect(EXTRACTION_PROMPT.length).toBeGreaterThan(0);
    });

    it('dovrebbe includere la struttura JSON attesa', () => {
      expect(EXTRACTION_PROMPT).toContain('"name"');
      expect(EXTRACTION_PROMPT).toContain('"phone"');
      expect(EXTRACTION_PROMPT).toContain('"sintomi"');
      expect(EXTRACTION_PROMPT).toContain('JSON');
    });

    it('dovrebbe includere regole per urgenza', () => {
      expect(EXTRACTION_PROMPT).toContain('bassa|media|alta');
      expect(EXTRACTION_PROMPT).toContain('urgenza');
    });
  });

  describe('buildConversationPrompt', () => {
    it('dovrebbe includere SYSTEM_PROMPT di base', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'greeting',
        history: []
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt).toContain('Emma');
      expect(prompt).toContain('Centro Fisioterapia Movimento');
    });

    it('dovrebbe includere STEP ATTUALE', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'symptom',
        history: []
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt).toContain('STEP ATTUALE: symptom');
    });

    it('dovrebbe includere la storia della conversazione', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'duration',
        history: [
          { role: 'assistant', content: 'Buongiorno!' },
          { role: 'user', content: 'Ho mal di schiena' }
        ]
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt).toContain('STORIA DELLA CONVERSAZIONE');
      expect(prompt).toContain('Buongiorno!');
      expect(prompt).toContain('Ho mal di schiena');
    });

    it('dovrebbe includere solo gli ultimi 6 messaggi della storia', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'duration',
        history: [
          { role: 'assistant', content: 'Msg 1' },
          { role: 'user', content: 'Msg 2' },
          { role: 'assistant', content: 'Msg 3' },
          { role: 'user', content: 'Msg 4' },
          { role: 'assistant', content: 'Msg 5' },
          { role: 'user', content: 'Msg 6' },
          { role: 'assistant', content: 'Msg 7' },
          { role: 'user', content: 'Msg 8' }
        ]
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt).toContain('Msg 3'); // Dal terzo in poi
      expect(prompt).toContain('Msg 8');
      expect(prompt).not.toContain('Msg 1'); // Primi 2 non inclusi
      expect(prompt).not.toContain('Msg 2');
    });

    it('dovrebbe includere i dati già raccolti', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {
          name: 'Marco',
          sintomi: 'Mal di schiena',
          durata: '2 settimane'
        },
        step: 'urgency',
        history: []
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt).toContain('DATI GIÀ RACCOLTI');
      expect(prompt).toContain('name: Marco');
      expect(prompt).toContain('sintomi: Mal di schiena');
      expect(prompt).toContain('durata: 2 settimane');
    });

    it('dovrebbe filtrare campi vuoti dai dati raccolti', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {
          name: 'Marco',
          phone: '',
          email: undefined,
          sintomi: 'Mal di schiena'
        },
        step: 'contact',
        history: []
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt).toContain('name: Marco');
      expect(prompt).toContain('sintomi: Mal di schiena');
      expect(prompt).not.toContain('phone:');
      expect(prompt).not.toContain('email:');
    });

    it('dovrebbe generare istruzioni per ogni step', () => {
      const steps: ChatStep[] = ['greeting', 'symptom', 'duration', 'urgency', 'availability', 'contact', 'complete'];

      for (const step of steps) {
        const context: ChatContext = {
          sessionId: 'test-session',
          collectedData: {},
          step,
          history: []
        };

        const prompt = buildConversationPrompt(context);
        expect(prompt).toContain(`STEP ATTUALE: ${step}`);
        expect(prompt.length).toBeGreaterThan(100); // Dovrebbe includere istruzioni
      }
    });

    it('dovrebbe avere istruzioni specifiche per greeting', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'greeting',
        history: []
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt).toContain('Saluta il paziente');
    });

    it('dovrebbe avere istruzioni specifiche per symptom', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'symptom',
        history: []
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt.toLowerCase()).toContain('sintomi');
    });

    it('dovrebbe avere istruzioni specifiche per contact', () => {
      const context: ChatContext = {
        sessionId: 'test-session',
        collectedData: {},
        step: 'contact',
        history: []
      };

      const prompt = buildConversationPrompt(context);
      expect(prompt.toLowerCase()).toContain('contatto');
    });
  });

  describe('buildExtractionPrompt', () => {
    it('dovrebbe includere EXTRACTION_PROMPT', () => {
      const conversation = 'Paziente: Ho mal di schiena\nEmma: Da quanto tempo?';
      const prompt = buildExtractionPrompt(conversation);

      expect(prompt).toContain('Estrai le seguenti informazioni');
    });

    it('dovrebbe includere la conversazione', () => {
      const conversation = 'Paziente: Ho mal di schiena\nEmma: Da quanto tempo?';
      const prompt = buildExtractionPrompt(conversation);

      expect(prompt).toContain('CONVERSAZIONE');
      expect(prompt).toContain(conversation);
    });

    it('dovrebbe funzionare con conversazione vuota', () => {
      const prompt = buildExtractionPrompt('');
      expect(prompt).toContain('CONVERSAZIONE');
      expect(prompt).toContain('Estrai');
    });
  });
});
