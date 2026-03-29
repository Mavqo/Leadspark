export interface Paziente {
  id: string;
  name: string;
  phone: string;
  email?: string;
  sintomi: string;
  durata: string;
  urgenza: 'bassa' | 'media' | 'alta';
  disponibilita: string;
  notes?: string;
  source: 'chatbot';
  createdAt: Date;
}

export type PartialPaziente = Partial<Paziente>;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ChatStep = 'greeting' | 'symptom' | 'duration' | 'urgency' | 'availability' | 'contact' | 'complete';

export interface ChatContext {
  sessionId: string;
  collectedData: Partial<Paziente>;
  step: ChatStep;
  history: ChatMessage[];
}

export interface ChatRequest {
  message: string;
  sessionId: string;
  context?: Partial<ChatContext>;
}

export interface ChatResponse {
  reply: string;
  leadData?: Partial<Paziente>;
  complete?: boolean;
  step?: ChatStep;
}

export interface LeadRequest {
  name: string;
  phone: string;
  email?: string;
  sintomi: string;
  durata: string;
  urgenza: 'bassa' | 'media' | 'alta';
  disponibilita: string;
  notes?: string;
}

export interface LeadResponse {
  success: boolean;
  pazienteId: string;
  message: string;
}

export interface WebhookEvent {
  event: 'paziente.qualified' | 'notification.sent' | 'notification.failed';
  data: {
    pazienteId?: string;
    paziente?: Paziente;
    message?: string;
    timestamp: string;
  };
}

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
