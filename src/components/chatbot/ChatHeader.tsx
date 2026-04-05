import React, { memo } from 'react';
import type { ChatHeaderProps } from './types';

/**
 * ChatHeader component - Displays the chat window header
 * Contains assistant info, online status, and control buttons
 */
export const ChatHeader: React.FC<ChatHeaderProps> = memo(({ onMinimize, onClose }) => {
  return (
    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center" aria-hidden="true">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-5 h-5" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <h3 id="chat-title" className="font-semibold text-sm">Assistente Centro Movimento</h3>
          <p id="chat-description" className="text-xs text-blue-100 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true"></span>
            <span className="sr-only">Stato:</span>
            Online
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onMinimize}
          className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
          aria-label="Minimizza chat"
          type="button"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-4 h-4" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="4 14 10 14 10 20"/>
            <polyline points="20 10 14 10 14 4"/>
            <line x1="14" y1="10" x2="21" y2="3"/>
            <line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
        </button>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
          aria-label="Chiudi chat"
          type="button"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-4 h-4" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18"/>
            <path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
    </div>
  );
});

// Display name for debugging
ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
