import React, { memo } from 'react';
import type { LoadingIndicatorProps } from './types';

/**
 * SkeletonMessage - Skeleton loading placeholder for chat messages
 */
const SkeletonMessage: React.FC = memo(() => (
  <div className="flex gap-3 mb-4 flex-row animate-pulse">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
    <div className="flex-1 max-w-[80%] space-y-2">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
    </div>
  </div>
));

SkeletonMessage.displayName = 'SkeletonMessage';

/**
 * TypingIndicator - Animated typing dots with enhanced styling
 */
const TypingIndicator: React.FC = memo(() => (
  <div className="flex gap-1">
    <span 
      className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" 
      style={{ animationDelay: '0ms', animationDuration: '0.6s' }}
    />
    <span 
      className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" 
      style={{ animationDelay: '150ms', animationDuration: '0.6s' }}
    />
    <span 
      className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce" 
      style={{ animationDelay: '300ms', animationDuration: '0.6s' }}
    />
  </div>
));

TypingIndicator.displayName = 'TypingIndicator';

/**
 * LoadingIndicator component - Shows animated typing indicator
 * Used when waiting for bot response
 * 
 * Features:
 * - Animated typing dots with staggered animation
 * - Bot avatar with pulse ring effect
 * - Accessible with proper ARIA labels
 * - Dark mode support
 * 
 * @example
 * ```tsx
 * <LoadingIndicator />
 * <LoadingIndicator className="mt-4" />
 * ```
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = memo(({ className = '' }) => {
  return (
    <div 
      className={`flex gap-3 mb-4 flex-row ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Assistente sta scrivendo"
    >
      {/* Bot Avatar with pulse effect */}
      <div className="flex-shrink-0 relative">
        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20" style={{ animationDuration: '2s' }} />
        <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-md">
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
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
      </div>
      
      {/* Message Bubble with typing indicator */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-200 dark:border-slate-700">
        <TypingIndicator />
      </div>
    </div>
  );
});

// Display name for debugging
LoadingIndicator.displayName = 'LoadingIndicator';

export default LoadingIndicator;
