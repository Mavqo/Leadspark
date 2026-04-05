import React, { memo } from 'react';

interface ToggleButtonProps {
  onClick: () => void;
  hasMessages: boolean;
  className?: string;
}

/**
 * ToggleButton component - Floating button to open the chat
 * Displays a notification badge when there are no messages
 */
export const ToggleButton: React.FC<ToggleButtonProps> = memo(({ 
  onClick, 
  hasMessages, 
  className = '' 
}) => {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 focus-visible:ring-4 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${className}`}
      aria-label={hasMessages ? "Apri chat - hai messaggi non letti" : "Apri chat con l'assistente virtuale"}
      aria-haspopup="dialog"
      type="button"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-6 h-6" 
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
      {/* Badge for new messages */}
      {!hasMessages && (
        <span 
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse"
          aria-hidden="true"
        >
          <span className="sr-only">1 messaggio non letto</span>
          1
        </span>
      )}
    </button>
  );
});

// Display name for debugging
ToggleButton.displayName = 'ToggleButton';

export default ToggleButton;
