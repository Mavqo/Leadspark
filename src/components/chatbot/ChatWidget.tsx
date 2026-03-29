import React, { useEffect, useRef, useCallback, useState } from 'react';
import { MessageCircle, X, Minimize2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { useChat } from './hooks/useChat';

interface ChatWidgetProps {
  className?: string;
}

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
  const [isVisible, setIsVisible] = useState(false);

  // Inizializza la chat con il primo messaggio quando si apre per la prima volta
  useEffect(() => {
    if (state.isOpen && state.messages.length === 0) {
      initializeChat();
    }
  }, [state.isOpen, state.messages.length, initializeChat]);

  // Scroll automatico verso l'ultimo messaggio
  useEffect(() => {
    if (state.isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.messages, state.isOpen]);

  // Gestione focus trap per accessibilità
  useEffect(() => {
    if (state.isOpen) {
      setIsVisible(true);
      // Focus sul primo elemento interattivo dopo l'apertura
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    } else {
      // Delay per permettere l'animazione di chiusura
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [state.isOpen]);

  // Gestione tasto ESC per chiudere
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && state.isOpen) {
        closeChat();
      }
    };

    if (state.isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Previeni scroll del body su mobile
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [state.isOpen, closeChat]);

  // Click outside per chiudere (solo su desktop)
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && window.innerWidth >= 640) {
      closeChat();
    }
  }, [closeChat]);

  const hasMessages = state.messages.length > 0;

  return (
    <>
      {/* Overlay per mobile */}
      {state.isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 sm:hidden transition-opacity duration-300"
          onClick={handleOverlayClick}
        />
      )}

      {/* Floating Button */}
      {!state.isOpen && (
        <button
          onClick={toggleChat}
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${className}`}
          aria-label="Apri chat"
        >
          <MessageCircle className="w-6 h-6" />
          {/* Badge per nuovi messaggi */}
          {!hasMessages && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
              1
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      <div
        ref={chatWindowRef}
        className={`fixed z-50 transition-all duration-300 ease-out ${
          state.isOpen
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
        } ${
          // Mobile: fullscreen
          'inset-0 sm:inset-auto sm:bottom-6 sm:right-6'
        } ${
          // Desktop: dimensioni fisse
          'sm:w-[380px] sm:h-[550px]'
        }`}
        style={{ visibility: isVisible || state.isOpen ? 'visible' : 'hidden' }}
        role="dialog"
        aria-modal="true"
        aria-label="Chat assistente virtuale"
      >
        <div className="w-full h-full sm:h-full bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Assistente Centro Movimento</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleChat}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Minimizza chat"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={closeChat}
                className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Chiudi chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div 
            className="flex-1 overflow-y-auto p-4 bg-gray-50"
            ref={firstInputRef}
            tabIndex={-1}
          >
            {hasMessages ? (
              <>
                {state.messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))}
                {state.isLoading && (
                  <div className="flex gap-3 mb-4 flex-row">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Inizia una conversazione</p>
              </div>
            )}
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
