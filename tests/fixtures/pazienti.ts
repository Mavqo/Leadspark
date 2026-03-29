/**
 * LeadSpark Test Fixtures
 * Dati di test per pazienti e lead
 */

import type { Paziente, LeadRequest, ChatContext, ChatMessage } from '../../src/types/paziente';

// ============================================================================
// PAZIENTI VALIDI
// ============================================================================

/**
 * Paziente completo valido - caso standard
 */
export const pazienteCompleto: LeadRequest = {
  name: 'Marco Rossi',
  phone: '+393331234567',
  email: 'marco.rossi@example.com',
  sintomi: 'Mal di schiena lombare',
  durata: '2 settimane',
  urgenza: 'media',
  disponibilita: 'Martedì pomeriggio',
  notes: 'Preferisce trattamenti manuali'
};

/**
 * Paziente senza email (opzionale)
 */
export const pazienteSenzaEmail: LeadRequest = {
  name: 'Giulia Bianchi',
  phone: '3389876543',
  sintomi: 'Cervicale e mal di testa',
  durata: '1 mese',
  urgenza: 'bassa',
  disponibilita: 'Lun-Ven mattina'
};

/**
 * Paziente con urgenza alta
 */
export const pazienteUrgenzaAlta: LeadRequest = {
  name: 'Luca Verdi',
  phone: '+39 347 123 4567',
  email: 'luca.verdi@test.it',
  sintomi: 'Fortissimo dolore alla schiena, non riesco a muovermi',
  durata: '3 giorni',
  urgenza: 'alta',
  disponibilita: 'Oggi pomeriggio o domani mattina',
  notes: 'Ha avuto un incidente sportivo'
};

// ============================================================================
// PAZIENTI CON DATI INCOMPLETI (per test validazione)
// ============================================================================

/**
 * Paziente con dati incompleti - manca telefono
 */
export const pazienteMancaTelefono: Partial<LeadRequest> = {
  name: 'Anna Neri',
  email: 'anna.neri@example.com',
  sintomi: 'Mal di schiena',
  durata: '1 settimana',
  urgenza: 'media',
  disponibilita: 'Giovedì'
};

/**
 * Paziente con dati incompleti - manca nome
 */
export const pazienteMancaNome: Partial<LeadRequest> = {
  phone: '3334445556',
  sintomi: 'Dolore al ginocchio',
  durata: '2 mesi',
  urgenza: 'media',
  disponibilita: 'Fine settimana'
};

/**
 * Paziente con telefono invalido
 */
export const pazienteTelefonoInvalido: LeadRequest = {
  name: 'Paolo Gialli',
  phone: 'abc123',
  sintomi: 'Mal di schiena',
  durata: '1 settimana',
  urgenza: 'media',
  disponibilita: 'Venerdì'
};

/**
 * Paziente con email invalida
 */
export const pazienteEmailInvalida: LeadRequest = {
  name: 'Sara Blu',
  phone: '3337778889',
  email: 'email-non-valida',
  sintomi: 'Dolore alla spalla',
  durata: '3 settimane',
  urgenza: 'bassa',
  disponibilita: 'Lunedì mattina'
};

/**
 * Paziente con nome troppo corto
 */
export const pazienteNomeCorto: LeadRequest = {
  name: 'A',
  phone: '3331112223',
  sintomi: 'Mal di schiena',
  durata: '1 settimana',
  urgenza: 'media',
  disponibilita: 'Mercoledì'
};

/**
 * Paziente con urgenza invalida
 */
export const pazienteUrgenzaInvalida = {
  name: 'Roberto Viola',
  phone: '3339990001',
  sintomi: 'Dolore al collo',
  durata: '5 giorni',
  urgenza: 'critica', // Non valido, dovrebbe essere bassa/media/alta
  disponibilita: 'Sabato'
};

// ============================================================================
// CONTEXTO CHAT PER TEST
// ============================================================================

/**
 * Contesto iniziale (greeting)
 */
export const contestoIniziale: ChatContext = {
  sessionId: 'test-session-001',
  collectedData: {},
  step: 'greeting',
  history: []
};

/**
 * Contesto dopo sintomi raccolti
 */
export const contestoConSintomi: ChatContext = {
  sessionId: 'test-session-002',
  collectedData: {
    sintomi: 'Mal di schiena'
  },
  step: 'duration',
  history: [
    { role: 'assistant', content: 'Buongiorno! Come posso aiutarla?' },
    { role: 'user', content: 'Ho mal di schiena' }
  ]
};

/**
 * Contesto completo con tutti i dati
 */
export const contestoCompleto: ChatContext = {
  sessionId: 'test-session-003',
  collectedData: {
    name: 'Marco Rossi',
    phone: '3331234567',
    sintomi: 'Mal di schiena',
    durata: '2 settimane',
    urgenza: 'media',
    disponibilita: 'Martedì pomeriggio'
  },
  step: 'complete',
  history: [
    { role: 'assistant', content: 'Buongiorno! Come posso aiutarla?' },
    { role: 'user', content: 'Ciao' },
    { role: 'assistant', content: 'Buongiorno! Sono Emma, l\'assistente virtuale. Come posso aiutarla?' },
    { role: 'user', content: 'Mal di schiena' },
    { role: 'assistant', content: 'Mi dispiace sentirlo. Da quanto tempo ha questo dolore?' },
    { role: 'user', content: '2 settimane' },
    { role: 'assistant', content: 'Capisco. Riesce a muoversi normalmente o ha difficoltà?' },
    { role: 'user', content: 'Dolore moderato' },
    { role: 'assistant', content: 'Grazie. Per completare la richiesta, potrebbe darmi il suo nome?' },
    { role: 'user', content: 'Marco' },
    { role: 'assistant', content: 'Grazie Marco! Il suo numero di telefono?' },
    { role: 'user', content: '3331234567' },
    { role: 'assistant', content: 'Perfetto. Quando è disponibile per un appuntamento?' },
    { role: 'user', content: 'Martedì pomeriggio' }
  ]
};

// ============================================================================
// FLUSSO CONVERSAZIONE COMPLETA
// ============================================================================

/**
 * Flusso conversazione completa step-by-step
 */
export const flussoConversazione = [
  {
    step: 'greeting',
    input: 'Ciao',
    expectedReplyContains: ['Buongiorno', 'assistente', 'aiutarla'],
    expectedNextStep: 'symptom'
  },
  {
    step: 'symptom',
    input: 'Mal di schiena',
    expectedReplyContains: ['dispiace', 'dolore', 'quanto tempo', 'durata'],
    expectedNextStep: 'duration',
    expectedData: { sintomi: 'Mal di schiena' }
  },
  {
    step: 'duration',
    input: '2 settimane',
    expectedReplyContains: ['capisco', 'muoversi', 'difficoltà', 'urgenza'],
    expectedNextStep: 'urgency',
    expectedData: { durata: '2 settimane' }
  },
  {
    step: 'urgency',
    input: 'Dolore moderato',
    expectedReplyContains: ['nome', 'completare', 'richiesta'],
    expectedNextStep: 'contact',
    expectedData: { urgenza: 'media' }
  },
  {
    step: 'contact',
    input: 'Marco',
    expectedReplyContains: ['telefono', 'numero'],
    expectedNextStep: 'contact',
    expectedData: { name: 'Marco' }
  },
  {
    step: 'contact',
    input: '3331234567',
    expectedReplyContains: ['disponibile', 'appuntamento', 'mattina', 'pomeriggio'],
    expectedNextStep: 'availability',
    expectedData: { phone: '3331234567' }
  },
  {
    step: 'availability',
    input: 'Martedì pomeriggio',
    expectedReplyContains: ['perfetto', 'confermare', 'contatteremo'],
    expectedNextStep: 'complete',
    expectedData: { disponibilita: 'Martedì pomeriggio' },
    expectedComplete: true
  }
];

// ============================================================================
// WEBHOOK EVENTS
// ============================================================================

/**
 * Evento webhook paziente qualificato valido
 */
export const webhookPazienteQualificato = {
  event: 'paziente.qualified' as const,
  data: {
    pazienteId: 'paz_1234567890',
    paziente: {
      id: 'paz_1234567890',
      name: 'Marco Rossi',
      phone: '+393331234567',
      email: 'marco@example.com',
      sintomi: 'Mal di schiena',
      durata: '2 settimane',
      urgenza: 'media',
      disponibilita: 'Martedì pomeriggio',
      source: 'chatbot',
      createdAt: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  }
};

/**
 * Evento webhook notifica inviata
 */
export const webhookNotificaInviata = {
  event: 'notification.sent' as const,
  data: {
    pazienteId: 'paz_1234567890',
    message: 'Conferma appuntamento inviata via WhatsApp',
    timestamp: new Date().toISOString()
  }
};

/**
 * Evento webhook notifica fallita
 */
export const webhookNotificaFallita = {
  event: 'notification.failed' as const,
  data: {
    pazienteId: 'paz_1234567890',
    message: 'Errore invio email: mailbox piena',
    timestamp: new Date().toISOString()
  }
};

/**
 * Evento webhook con formato invalido
 */
export const webhookInvalido = {
  event: 'evento.sconosciuto',
  data: {
    pazienteId: 'paz_123',
    timestamp: new Date().toISOString()
  }
};

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Genera un ID sessione univoco per i test
 */
export function generateTestSessionId(): string {
  return `test-sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Crea un paziente completo con dati custom
 */
export function createPaziente(overrides: Partial<LeadRequest> = {}): LeadRequest {
  return {
    ...pazienteCompleto,
    ...overrides
  };
}

/**
 * Crea un contesto chat con dati custom
 */
export function createContesto(overrides: Partial<ChatContext> = {}): ChatContext {
  return {
    sessionId: generateTestSessionId(),
    collectedData: {},
    step: 'greeting',
    history: [],
    ...overrides
  };
}
