import { useReducer, useCallback } from 'react';
import type { ChatState, ChatAction, ChatMessage, LeadData, ChatStep, ChatApiResponse } from '../types';
import { TIMING, ERROR_MESSAGES, INITIAL_MESSAGE } from '../constants';

const initialState: ChatState = {
  isOpen: false,
  messages: [],
  isLoading: false,
  leadData: {},
  currentStep: 'greeting',
};

/**
 * Generates a unique ID for messages
 * Uses timestamp + random string for collision resistance
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Chat reducer - Pure function to handle all state transitions
 */
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'TOGGLE_CHAT':
      return { ...state, isOpen: !state.isOpen };
    case 'OPEN_CHAT':
      return { ...state, isOpen: true };
    case 'CLOSE_CHAT':
      return { ...state, isOpen: false };
    case 'SEND_MESSAGE': {
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
    }
    case 'RECEIVE_MESSAGE': {
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
    }
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
            content: INITIAL_MESSAGE.content,
            timestamp: new Date(),
          },
        ],
      };
    default:
      return state;
  }
}

/**
 * Mock API call - Simulates server response for chat messages
 * In production, replace with actual API call
 */
function mockApiCall(
  message: string, 
  step: ChatStep, 
  leadData: LeadData
): Promise<ChatApiResponse> {
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
        case 'urgenza': {
          const urgenza = message.toLowerCase().includes('alta') ? 'alta' : 
                         message.toLowerCase().includes('bassa') ? 'bassa' : 'media';
          resolve({
            response: "Grazie per l'informazione. Potrebbe dirmi il suo nome?",
            nextStep: 'nome',
            leadUpdate: { urgenza },
          });
          break;
        }
        case 'nome': {
          const firstName = message.split(' ')[0];
          resolve({
            response: `Piacere di conoscerla, ${firstName}. Qual è il suo numero di telefono per poterla contattare?`,
            nextStep: 'telefono',
            leadUpdate: { nome: message },
          });
          break;
        }
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
    }, TIMING.MOCK_API_DELAY);
  });
}

/**
 * Custom hook for managing chat state and operations
 * Provides actions and state for the chat widget
 */
export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const toggleChat = useCallback((): void => {
    dispatch({ type: 'TOGGLE_CHAT' });
  }, []);

  const openChat = useCallback((): void => {
    dispatch({ type: 'OPEN_CHAT' });
  }, []);

  const closeChat = useCallback((): void => {
    dispatch({ type: 'CLOSE_CHAT' });
  }, []);

  /**
   * Sends a message and processes the response
   * Handles errors with proper logging
   */
  const sendMessage = useCallback(async (message: string): Promise<void> => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    // Add user message
    dispatch({ type: 'SEND_MESSAGE', payload: trimmedMessage });
    
    // Show loading
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Call mock API
      const result = await mockApiCall(trimmedMessage, state.currentStep, state.leadData);
      
      // Update lead data if provided
      if (result.leadUpdate) {
        dispatch({ type: 'UPDATE_LEAD_DATA', payload: result.leadUpdate });
      }
      
      // Update step
      dispatch({ type: 'SET_STEP', payload: result.nextStep });
      
      // Receive response
      dispatch({ type: 'RECEIVE_MESSAGE', payload: result.response });
    } catch (error) {
      // Log error for debugging
      console.error('[useChat] Error sending message:', error);
      
      // Show user-friendly error message
      dispatch({ 
        type: 'RECEIVE_MESSAGE', 
        payload: ERROR_MESSAGES.GENERIC
      });
    }
  }, [state.currentStep, state.leadData]);

  const resetChat = useCallback((): void => {
    dispatch({ type: 'RESET_CHAT' });
  }, []);

  const initializeChat = useCallback((): void => {
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
