import { useReducer, useCallback } from 'react';
import { ChatState, ChatAction, ChatMessage, LeadData } from '../types';

const initialState: ChatState = {
  isOpen: false,
  messages: [],
  isLoading: false,
  leadData: {},
  currentStep: 'greeting',
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'TOGGLE_CHAT':
      return { ...state, isOpen: !state.isOpen };
    case 'OPEN_CHAT':
      return { ...state, isOpen: true };
    case 'CLOSE_CHAT':
      return { ...state, isOpen: false };
    case 'SEND_MESSAGE':
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: action.payload,
        timestamp: new Date(),
      };
      return {
        ...state,
        messages: [...state.messages, userMessage],
      };
    case 'RECEIVE_MESSAGE':
      const botMessage: ChatMessage = {
        id: generateId(),
        role: 'bot',
        content: action.payload,
        timestamp: new Date(),
      };
      return {
        ...state,
        messages: [...state.messages, botMessage],
        isLoading: false,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'UPDATE_LEAD_DATA':
      return {
        ...state,
        leadData: { ...state.leadData, ...action.payload },
      };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'RESET_CHAT':
      return {
        ...initialState,
        messages: [
          {
            id: generateId(),
            role: 'bot',
            content: "Buongiorno! Sono l'assistente virtuale del Centro Movimento. Dove sente dolore?",
            timestamp: new Date(),
          },
        ],
      };
    default:
      return state;
  }
}

// Mock API call per simulare risposta del server
function mockApiCall(message: string, step: ChatState['currentStep'], leadData: LeadData): Promise<{ response: string; nextStep: ChatState['currentStep']; leadUpdate?: Partial<LeadData> }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      switch (step) {
        case 'greeting':
          resolve({
            response: "Mi dispiace. Da quanto tempo ha questo dolore?",
            nextStep: 'durata',
            leadUpdate: { sintomi: message },
          });
          break;
        case 'durata':
          resolve({
            response: "Capisco. Riesce a muoversi normalmente o il dolore è intenso? Come valuta l'urgenza (bassa/media/alta)?",
            nextStep: 'urgenza',
            leadUpdate: { durata: message },
          });
          break;
        case 'urgenza':
          const urgenza = message.toLowerCase().includes('alta') ? 'alta' : 
                         message.toLowerCase().includes('bassa') ? 'bassa' : 'media';
          resolve({
            response: "Grazie per l'informazione. Potrebbe dirmi il suo nome?",
            nextStep: 'nome',
            leadUpdate: { urgenza },
          });
          break;
        case 'nome':
          resolve({
            response: `Piacere di conoscerla, ${message.split(' ')[0]}. Qual è il suo numero di telefono per poterla contattare?`,
            nextStep: 'telefono',
            leadUpdate: { nome: message },
          });
          break;
        case 'telefono':
          resolve({
            response: "Perfetto! Quando preferirebbe essere ricontattato per fissare una visita? (es. mattina, pomeriggio, giorni specifici)",
            nextStep: 'disponibilita',
            leadUpdate: { telefono: message },
          });
          break;
        case 'disponibilita':
          resolve({
            response: "Grazie mille per le informazioni! Uno dei nostri specialisti la ricontatterà al più presto. Buona giornata!",
            nextStep: 'completato',
            leadUpdate: { disponibilita: message },
          });
          break;
        default:
          resolve({
            response: "Ho ricevuto il suo messaggio. C'è altro che posso fare per aiutarla?",
            nextStep: step,
          });
      }
    }, 1500);
  });
}

export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const toggleChat = useCallback(() => {
    dispatch({ type: 'TOGGLE_CHAT' });
  }, []);

  const openChat = useCallback(() => {
    dispatch({ type: 'OPEN_CHAT' });
  }, []);

  const closeChat = useCallback(() => {
    dispatch({ type: 'CLOSE_CHAT' });
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Aggiungi messaggio utente
    dispatch({ type: 'SEND_MESSAGE', payload: message });
    
    // Mostra loading
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Chiama mock API
      const result = await mockApiCall(message, state.currentStep, state.leadData);
      
      // Aggiorna lead data se necessario
      if (result.leadUpdate) {
        dispatch({ type: 'UPDATE_LEAD_DATA', payload: result.leadUpdate });
      }
      
      // Aggiorna step
      dispatch({ type: 'SET_STEP', payload: result.nextStep });
      
      // Ricevi risposta
      dispatch({ type: 'RECEIVE_MESSAGE', payload: result.response });
    } catch (error) {
      dispatch({ 
        type: 'RECEIVE_MESSAGE', 
        payload: "Mi scusi, si è verificato un errore. Per favore riprovi più tardi." 
      });
    }
  }, [state.currentStep, state.leadData]);

  const resetChat = useCallback(() => {
    dispatch({ type: 'RESET_CHAT' });
  }, []);

  const initializeChat = useCallback(() => {
    dispatch({ type: 'RESET_CHAT' });
  }, []);

  return {
    state,
    toggleChat,
    openChat,
    closeChat,
    sendMessage,
    resetChat,
    initializeChat,
  };
}

export default useChat;
