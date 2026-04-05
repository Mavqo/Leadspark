/**
 * Constants for the ChatWidget component
 */

// Timing constants (in milliseconds)
export const TIMING = {
  /** Delay for focus after opening chat */
  FOCUS_DELAY: 100,
  /** Duration of close animation */
  CLOSE_ANIMATION_DURATION: 300,
  /** Mock API response delay */
  MOCK_API_DELAY: 1500,
  /** Debounce delay for resize */
  RESIZE_DEBOUNCE: 250,
} as const;

// UI constants
export const UI = {
  /** Maximum rows for textarea auto-resize */
  MAX_TEXTAREA_ROWS: 3,
  /** Line height for textarea calculations (px) */
  TEXTAREA_LINE_HEIGHT: 20,
  /** Chat widget dimensions */
  CHAT_WIDTH: 380,
  CHAT_HEIGHT: 550,
  /** Mobile breakpoint */
  MOBILE_BREAKPOINT: 640,
} as const;

// Chat steps in the conversation flow
export const CHAT_STEPS = {
  GREETING: 'greeting',
  SINTOMI: 'sintomi',
  DURATA: 'durata',
  URGENZA: 'urgenza',
  NOME: 'nome',
  TELEFONO: 'telefono',
  DISPONIBILITA: 'disponibilita',
  COMPLETATO: 'completato',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Mi scusi, si è verificato un errore. Per favore riprovi più tardi.',
  NETWORK: 'Errore di connessione. Controlla la tua connessione internet.',
  TIMEOUT: 'La richiesta ha impiegato troppo tempo. Riprova più tardi.',
} as const;

// Initial greeting message
export const INITIAL_MESSAGE = {
  content: "Buongiorno! Sono l'assistente virtuale del Centro Movimento. Dove sente dolore?",
} as const;
