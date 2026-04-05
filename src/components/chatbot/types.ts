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

export type ChatStep = 
  | 'greeting' 
  | 'sintomi' 
  | 'durata' 
  | 'urgenza' 
  | 'nome' 
  | 'telefono' 
  | 'disponibilita' 
  | 'completato';

export interface ChatState {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  leadData: LeadData;
  currentStep: ChatStep;
}

export type ChatAction =
  | { type: 'TOGGLE_CHAT' }
  | { type: 'OPEN_CHAT' }
  | { type: 'CLOSE_CHAT' }
  | { type: 'SEND_MESSAGE'; payload: string }
  | { type: 'RECEIVE_MESSAGE'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_LEAD_DATA'; payload: Partial<LeadData> }
  | { type: 'SET_STEP'; payload: ChatStep }
  | { type: 'RESET_CHAT' };

/** Props for the ChatWidget component */
export interface ChatWidgetProps {
  className?: string;
}

/** Props for the ChatMessage component */
export interface ChatMessageProps {
  message: ChatMessage;
}

/** Props for the ChatInput component */
export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Props for the ChatHeader component */
export interface ChatHeaderProps {
  onMinimize: () => void;
  onClose: () => void;
}

/** Props for the LoadingIndicator component */
export interface LoadingIndicatorProps {
  /** Optional CSS class names */
  className?: string;
}

/** API response from mock chat service */
export interface ChatApiResponse {
  response: string;
  nextStep: ChatStep;
  leadUpdate?: Partial<LeadData>;
}

/** Error structure for chat operations */
export interface ChatError {
  message: string;
  code: 'NETWORK' | 'TIMEOUT' | 'UNKNOWN';
  timestamp: Date;
}
