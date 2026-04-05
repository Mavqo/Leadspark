import React, { memo } from 'react';

/**
 * EmptyState component - Displayed when chat has no messages
 * Shows a friendly prompt to start the conversation
 */
export const EmptyState: React.FC = memo(() => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-12 h-12 mb-3 opacity-50" 
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
      <p className="text-sm">Inizia una conversazione</p>
    </div>
  );
});

// Display name for debugging
EmptyState.displayName = 'EmptyState';

export default EmptyState;
