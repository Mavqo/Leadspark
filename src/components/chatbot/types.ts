export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp?: Date;
}

export interface LeadData {
  nome?: string;
  telefono?: string;
  sintomi?: string;
  durata?: string;
  urgenza?: 'bassa' | 'media' | 'alta';
  disponibilita?: string;
}

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  leadData: LeadData;
  currentStep: 'greeting' | 'sintomi' | 'durata' | 'urgenza' | 'nome' | 'telefono' | 'disponibilita' | 'completato';
}

export type ChatAction =
  | { type: 'TOGGLE_CHAT' }
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'SEND_MESSAGE'; payload: string }
  | { type: 'RECEIVE_MESSAGE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_LEAD_DATA'; payload: Partial<LeadData> }
  | { type: 'SET_STEP'; payload: ChatState['currentStep'] }
  | { type: 'RESET_CHAT' };
