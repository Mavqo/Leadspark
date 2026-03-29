/**
 * LeadSpark OpenAI Mock
 * Mock per le chiamate API di OpenAI nei test
 */

import type { ChatContext, ChatResponse, ChatMessage } from '../../src/types/paziente';

// ============================================================================
// MOCK RESPONSES
// ============================================================================

/**
 * Risposte simulate per step della conversazione
 */
const mockResponses: Record<string, (message: string, context: ChatContext) => ChatResponse> = {
  greeting: (message) => ({
    reply: "Buongiorno! Sono Emma, l'assistente virtuale del Centro Fisioterapia. Come posso aiutarla oggi?",
    step: 'symptom',
    complete: false,
    leadData: {}
  }),
  
  symptom: (message) => ({
    reply: "Mi dispiace sentirlo. Da quanto tempo ha questo dolore?",
    step: 'duration',
    complete: false,
    leadData: { sintomi: message }
  }),
  
  duration: (message) => ({
    reply: "Capisco. Riesce a muoversi normalmente o ha difficoltà? Come descriverebbe l'intensità del dolore?",
    step: 'urgency',
    complete: false,
    leadData: { durata: message }
  }),
  
  urgency: (message) => {
    // Determina livello urgenza dal messaggio
    const msg = message.toLowerCase();
    let urgenza: 'bassa' | 'media' | 'alta' = 'media';
    if (msg.includes('forte') || msg.includes('grave') || msg.includes('tanto')) {
      urgenza = 'alta';
    } else if (msg.includes('moderato') || msg.includes('medio')) {
      urgenza = 'media';
    } else if (msg.includes('lieve') || msg.includes('poco')) {
      urgenza = 'bassa';
    }
    
    return {
      reply: "Grazie per queste informazioni. Per completare la richiesta, potrebbe darmi il suo nome?",
      step: 'contact',
      complete: false,
      leadData: { urgenza }
    };
  },
  
  contact: (message, context) => {
    const hasName = context.collectedData.name;
    const hasPhone = context.collectedData.phone;
    
    // Estrai potenziale nome o telefono dal messaggio
    const isPhone = /\d{7,}/.test(message.replace(/\s/g, ''));
    
    if (!hasName && !isPhone) {
      return {
        reply: "Grazie! Ora mi serve il suo numero di telefono per poterla ricontattare.",
        step: 'contact',
        complete: false,
        leadData: { name: message }
      };
    }
    
    if (!hasPhone || isPhone) {
      return {
        reply: "Perfetto. Quando sarebbe disponibile per un appuntamento? Preferisce mattina o pomeriggio?",
        step: 'availability',
        complete: false,
        leadData: isPhone ? { phone: message.replace(/\s/g, '') } : {}
      };
    }
    
    return {
      reply: "Quando sarebbe disponibile per un appuntamento?",
      step: 'availability',
      complete: false,
      leadData: {}
    };
  },
  
  availability: (message, context) => ({
    reply: `Perfetto! Ho raccolto tutte le informazioni necessarie. La contatteremo al ${context.collectedData.phone || 'numero fornito'} per confermare l'appuntamento. C'è altro che posso fare per lei?`,
    step: 'complete',
    complete: true,
    leadData: { disponibilita: message }
  }),
  
  complete: (message) => ({
    reply: "Grazie per averci contattato! Un nostro operatore ti ricontatterà al più presto. Buona giornata!",
    step: 'complete',
    complete: true,
    leadData: {}
  })
};

// ============================================================================
// MOCK FUNCTIONS
// ============================================================================

/**
 * Mock di createChatCompletion
 */
export function mockCreateChatCompletion({
  message,
  context
}: {
  message: string;
  context: ChatContext;
}): Promise<ChatResponse> {
  const handler = mockResponses[context.step] || mockResponses.greeting;
  const response = handler(message, context);
  
  // Merge con dati già raccolti
  const mergedLeadData = {
    ...context.collectedData,
    ...response.leadData
  };
  
  return Promise.resolve({
    ...response,
    leadData: mergedLeadData
  });
}

/**
 * Mock di extractLeadData
 */
export function mockExtractLeadData(
  history: ChatMessage[],
  currentUserMessage: string,
  currentAssistantReply: string
): Promise<Record<string, string>> {
  const msg = currentUserMessage.toLowerCase();
  const extracted: Record<string, string> = {};
  
  // Estrazione semplificata basata su pattern
  if (msg.includes('schiena')) extracted.sintomi = currentUserMessage;
  if (msg.includes('settiman') || msg.includes('giorn')) extracted.durata = currentUserMessage;
  if (/\d{7,}/.test(msg.replace(/\s/g, ''))) extracted.phone = msg.replace(/\s/g, '');
  if (!extracted.phone && msg.length > 2 && !msg.includes('ciao') && !msg.includes('salve')) {
    extracted.name = currentUserMessage;
  }
  if (msg.includes('mattina') || msg.includes('pomerigg') || msg.includes('sera')) {
    extracted.disponibilita = currentUserMessage;
  }
  
  // Determina urgenza
  if (msg.includes('forte') || msg.includes('grave')) extracted.urgenza = 'alta';
  else if (msg.includes('moderato')) extracted.urgenza = 'media';
  else if (msg.includes('lieve')) extracted.urgenza = 'bassa';
  
  return Promise.resolve(extracted);
}

/**
 * Mock di generateSessionId
 */
export function mockGenerateSessionId(): string {
  return `mock-sess-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============================================================================
// VITEST MOCK SETUP
// ============================================================================

/**
 * Setup del mock per Vitest
 * Da usare nei test con: vi.mock('../../src/lib/openai', () => mockOpenAIModule())
 */
export function mockOpenAIModule() {
  return {
    createChatCompletion: mockCreateChatCompletion,
    extractLeadData: mockExtractLeadData,
    generateSessionId: mockGenerateSessionId
  };
}

/**
 * Mock factory per test E2E
 */
export function createOpenAIMock() {
  return {
    createChatCompletion: vi.fn(mockCreateChatCompletion),
    extractLeadData: vi.fn(mockExtractLeadData),
    generateSessionId: vi.fn(mockGenerateSessionId)
  };
}

// Import type per Vitest
declare const vi: {
  fn: <T>(implementation: T) => T;
};
