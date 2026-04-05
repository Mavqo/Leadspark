// Main exports for chatbot components
export { ChatWidget } from './ChatWidget';
export { ChatMessage } from './ChatMessage';
export { ChatInput } from './ChatInput';
export { ChatHeader } from './ChatHeader';
export { LoadingIndicator } from './LoadingIndicator';
export { EmptyState } from './EmptyState';
export { ToggleButton } from './ToggleButton';

// Hooks
export { useChat } from './hooks/useChat';

// Types
export type {
  ChatMessage as ChatMessageType,
  ChatState,
  ChatAction,
  LeadData,
  ChatStep,
  ChatWidgetProps,
  ChatMessageProps,
  ChatInputProps,
  ChatHeaderProps,
  LoadingIndicatorProps,
  ChatApiResponse,
  ChatError,
} from './types';

// Constants
export { TIMING, UI, CHAT_STEPS, ERROR_MESSAGES, INITIAL_MESSAGE } from './constants';
