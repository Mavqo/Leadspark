import React, { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import type { ChatInputProps } from './types';
import { UI } from './constants';

/**
 * ChatInput component - Text input area for chat messages
 * Features auto-resize textarea and keyboard shortcuts
 * Enhanced with ARIA attributes for accessibility
 */
export const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false,
  placeholder = "Scrivi un messaggio..."
}) => {
  const [message, setMessage] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [characterCount, setCharacterCount] = useState(0);

  /**
   * Handles sending the message
   * Validates input and resets textarea height after sending
   */
  const handleSend = useCallback((): void => {
    const trimmedMessage = message.trim();
    
    if (trimmedMessage && !disabled) {
      onSend(trimmedMessage);
      setMessage('');
      setCharacterCount(0);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, disabled, onSend]);

  /**
   * Handles keyboard events
   * Enter sends message, Shift+Enter adds new line
   */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * Handles textarea input changes
   * Implements auto-resize functionality with max rows limit
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const { value, style, scrollHeight } = e.target;
    
    setMessage(value);
    setCharacterCount(value.length);

    // Auto-resize textarea
    style.height = 'auto';
    
    // Calculate height based on max rows
    const maxHeight = UI.TEXTAREA_LINE_HEIGHT * UI.MAX_TEXTAREA_ROWS;
    const newHeight = Math.min(scrollHeight, maxHeight);
    
    style.height = `${newHeight}px`;
  }, []);

  const isSendDisabled = disabled || !message.trim();
  const inputPlaceholder = disabled ? "Attendere risposta..." : placeholder;
  const maxChars = 500;
  const charsRemaining = maxChars - characterCount;
  const nearLimit = charsRemaining <= 50;

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <form 
        className="flex items-end gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        aria-label="Form invio messaggio"
      >
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={inputPlaceholder}
            rows={1}
            maxLength={maxChars}
            className="w-full bg-transparent border-none resize-none outline-none text-sm text-gray-800 placeholder-gray-400 min-h-[20px] max-h-[60px] py-1.5 disabled:opacity-50"
            style={{ height: 'auto' }}
            aria-label="Messaggio chat"
            aria-describedby="chat-input-hint chat-char-count"
            aria-multiline="true"
            aria-required="true"
            aria-invalid={message.length > maxChars}
          />
          {/* Character count for screen readers */}
          <span id="chat-char-count" className="sr-only" aria-live="polite">
            {characterCount > 0 && `${characterCount} caratteri inseriti, ${charsRemaining} rimanenti`}
          </span>
        </div>
        <button
          onClick={handleSend}
          disabled={isSendDisabled}
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
            isSendDisabled
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
          }`}
          aria-label={disabled ? "Attendere risposta" : "Invia messaggio"}
          aria-disabled={isSendDisabled}
          type="submit"
        >
          {disabled ? (
            <svg 
              className="w-4 h-4 animate-spin" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg 
              className="w-4 h-4" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </form>
      
      {/* Helper text */}
      <div className="flex items-center justify-between mt-2">
        <p 
          id="chat-input-hint" 
          className="text-xs text-gray-400 flex-1"
        >
          Premi Invio per inviare • Shift + Invio per nuova riga
        </p>
        {/* Visual character count when near limit */}
        {nearLimit && characterCount > 0 && (
          <span 
            className={`text-xs ${charsRemaining <= 10 ? 'text-red-500 font-medium' : 'text-gray-400'}`}
            aria-hidden="true"
          >
            {charsRemaining}
          </span>
        )}
      </div>
      
      {/* Error message for screen readers */}
      {charsRemaining < 0 && (
        <p className="sr-only" role="alert">
          Limite caratteri superato. Rimuovi {Math.abs(charsRemaining)} caratteri.
        </p>
      )}
    </div>
  );
};

export default ChatInput;
