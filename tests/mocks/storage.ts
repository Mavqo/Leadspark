/**
 * LeadSpark Storage Mock
 * Mock per lo storage in-memory nei test
 */

import type { Paziente, ChatContext } from '../../src/types/paziente';

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

/**
 * Storage per leads (pazienti)
 */
export const mockLeadsStore = new Map<string, Paziente>();

/**
 * Storage per sessioni chat
 */
export const mockSessionsStore = new Map<string, ChatContext>();

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Salva un paziente nello storage
 */
export function saveMockLead(paziente: Paziente): void {
  mockLeadsStore.set(paziente.id, paziente);
}

/**
 * Ottieni un paziente dallo storage
 */
export function getMockLead(id: string): Paziente | undefined {
  return mockLeadsStore.get(id);
}

/**
 * Trova paziente per telefono (ultime 24h)
 */
export function findMockLeadByPhone(phone: string): Paziente | null {
  const normalizedPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  
  for (const paziente of mockLeadsStore.values()) {
    const storedPhone = paziente.phone.replace(/[\s\-\(\)\.]/g, '');
    if (storedPhone === normalizedPhone && paziente.createdAt.getTime() > oneDayAgo) {
      return paziente;
    }
  }
  
  return null;
}

/**
 * Salva una sessione nello storage
 */
export function saveMockSession(context: ChatContext): void {
  mockSessionsStore.set(context.sessionId, context);
}

/**
 * Ottieni una sessione dallo storage
 */
export function getMockSession(sessionId: string): ChatContext | undefined {
  return mockSessionsStore.get(sessionId);
}

/**
 * Ottieni tutti i leads
 */
export function getAllMockLeads(): Paziente[] {
  return Array.from(mockLeadsStore.values())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Ottieni tutte le sessioni
 */
export function getAllMockSessions(): ChatContext[] {
  return Array.from(mockSessionsStore.values());
}

/**
 * Conta i leads nello storage
 */
export function countMockLeads(): number {
  return mockLeadsStore.size;
}

/**
 * Conta le sessioni nello storage
 */
export function countMockSessions(): number {
  return mockSessionsStore.size;
}

// ============================================================================
// RESET FUNCTIONS
// ============================================================================

/**
 * Reset completo dello storage
 */
export function resetMockStorage(): void {
  mockLeadsStore.clear();
  mockSessionsStore.clear();
}

/**
 * Reset solo leads
 */
export function resetMockLeads(): void {
  mockLeadsStore.clear();
}

/**
 * Reset solo sessioni
 */
export function resetMockSessions(): void {
  mockSessionsStore.clear();
}

// ============================================================================
// VITEST SETUP
// ============================================================================

/**
 * Setup automatico reset storage per Vitest
 */
export function setupStorageMock() {
  beforeEach(() => {
    resetMockStorage();
  });
}

// Import type per Vitest
declare const beforeEach: (fn: () => void) => void;
