import React, { useEffect, useRef, useCallback, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import { LoadingIndicator } from './LoadingIndicator';
import { EmptyState } from './EmptyState';
import { ToggleButton } from './ToggleButton';
import { useChat } from './hooks/useChat';
import type { ChatWidgetProps } from './types';
import { TIMING, UI } from './constants';

/**
 * MobileOverlay component - Backdrop for mobile chat view
 */
const MobileOverlay: React.FC<{ onClick: (e: React.MouseEvent) => void }> = ({ onClick }) => (
  <div 
    className="fixed inset-0 bg-black/30 z-40 sm:hidden transition-opacity duration-300"
    onClick={onClick}
    aria-hidden="true"
  />
);

/**
 * ChatMessages component - Renders the list of messages with live region for screen readers
 */
const ChatMessages: React.FC<{
  messages: Array<{ id: string; role: 'user' | 'bot'; content: string; timestamp?: Date }>;
  isLoading: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  hasMessages: boolean;
}> = ({ messages, isLoading, messagesEndRef, hasMessages }) => {
  if (!hasMessages) {
    return <EmptyState />;
  }

  return (
    <>
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
      {isLoading && <LoadingIndicator />}
      <div ref={messagesEndRef} />
    </>
  );
};

/**
 * Custom hook to trap focus within the chat widget for accessibility
 */
const useFocusTrap = (isActive: boolean, containerRef: React.RefObject<HTMLElement>) => {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isActive && containerRef.current) {
      // Store the previously focused element
      previouslyFocusedElement.current = document.activeElement as HTMLElement;
      
      // Find all focusable elements within the container
      const getFocusableElements = () => {
        const container = containerRef.current;
        if (!container) return [];
        
        return Array.from(
          container.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
      };

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Focus the first element
      firstElement?.focus();

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const currentElements = getFocusableElements();
        const currentFirst = currentElements[0];
        const currentLast = currentElements[currentElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === currentFirst) {
            e.preventDefault();
            currentLast?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === currentLast) {
            e.preventDefault();
            currentFirst?.focus();
          }
        }
      };

      containerRef.current.addEventListener('keydown', handleTabKey);

      return () => {
        containerRef.current?.removeEventListener('keydown', handleTabKey);
        // Restore focus when closing
        previouslyFocusedElement.current?.focus();
      };
    }
  }, [isActive, containerRef]);
};

/**
 * ChatWidget component - Main chat interface
 * Provides a floating chat button and expandable chat window
 * 
 * @example
 * ```tsx
 * <ChatWidget className="custom-class" />
 * ```
 */
export const ChatWidget: React.FC<ChatWidgetProps> = ({ className = '' }) => {
  const { 
    state, 
    toggleChat, 
    closeChat, 
    sendMessage, 
    initializeChat 
  } = useChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);

  const hasMessages = state.messages.length > 0;

  // Initialize chat with first message when opened for the first time
  useEffect(() => {
    if (state.isOpen && state.messages.length === 0) {
      initializeChat();
    }
  }, [state.isOpen, state.messages.length, initializeChat]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (state.isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages, state.isOpen]);

  // Announce new messages to screen readers
  useEffect(() => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage && lastMessage.id !== lastMessageId && liveRegionRef.current) {
      setLastMessageId(lastMessage.id);
      const announcement = lastMessage.role === 'bot' 
        ? `Nuovo messaggio dall'assistente: ${lastMessage.content}`
        : `Hai inviato: ${lastMessage.content}`;
      liveRegionRef.current.textContent = announcement;
      
      // Clear after announcement
      setTimeout(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.textContent = '';
        }
      }, 1000);
    }
  }, [state.messages, lastMessageId]);

  // Handle visibility and focus for accessibility
  useEffect(() => {
    if (state.isOpen) {
      setIsVisible(true);
      // Focus on first interactive element after opening
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, TIMING.FOCUS_DELAY);
      return () => clearTimeout(timer);
    } else {
      // Delay to allow close animation
      const timer = setTimeout(() => setIsVisible(false), TIMING.CLOSE_ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [state.isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && state.isOpen) {
        closeChat();
      }
    };

    if (state.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent body scroll on mobile
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [state.isOpen, closeChat]);

  // Activate focus trap when chat is open
  useFocusTrap(state.isOpen, chatWindowRef);

  // Handle click outside to close (desktop only)
  const handleOverlayClick = useCallback((e: React.MouseEvent): void => {
    if (e.target === e.currentTarget && window.innerWidth >= UI.MOBILE_BREAKPOINT) {
      closeChat();
    }
  }, [closeChat]);

  const visibilityStyle = { 
    visibility: (isVisible || state.isOpen) ? 'visible' as const : 'hidden' as const 
  };

  return (
    <>
      {/* Live region for screen reader announcements */}
      <div 
        ref={liveRegionRef}
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
        role="status"
      />

      {/* Mobile overlay */}
      {state.isOpen && <MobileOverlay onClick={handleOverlayClick} />}

      {/* Floating Button */}
      {!state.isOpen && (
        <ToggleButton 
          onClick={toggleChat} 
          hasMessages={hasMessages}
          className={className}
        />
      )}

      {/* Chat Window */}
      <div
        ref={chatWindowRef}
        className={`fixed z-50 transition-all duration-300 ease-out ${
          state.isOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        } ${
          // Mobile: fullscreen, Desktop: fixed size
          'inset-0 sm:inset-auto sm:bottom-6 sm:right-6'
        } ${
          'sm:w-[380px] sm:h-[550px]'
        }`}
        style={visibilityStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-title"
        aria-describedby="chat-description"
      >
        <div className="w-full h-full sm:h-full bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <ChatHeader 
            onMinimize={toggleChat} 
            onClose={closeChat} 
          />

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 bg-gray-50"
            ref={firstInputRef}
            tabIndex={-1}
            role="log"
            aria-live="polite"
            aria-label="Messaggi della chat"
          >
            <ChatMessages
              messages={state.messages}
              isLoading={state.isLoading}
              messagesEndRef={messagesEndRef}
              hasMessages={hasMessages}
            />
          </div>

          {/* Input Area */}
          <ChatInput 
            onSend={sendMessage} 
            disabled={state.isLoading}
            placeholder="Scrivi qui il tuo messaggio..."
          />
        </div>
      </div>
    </>
  );
};

export default ChatWidget;
