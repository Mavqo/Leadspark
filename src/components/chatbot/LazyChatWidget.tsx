import React, { lazy, Suspense, useEffect, useState, useRef } from 'react';
import type { ChatWidgetProps } from './types';

/**
 * Loading fallback for lazy-loaded chat widget
 */
const ChatWidgetFallback: React.FC = () => (
  <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
    <div className="w-14 h-14 bg-blue-600/50 rounded-full animate-pulse" />
  </div>
);

/**
 * Hook to detect when user scrolls near the bottom of the page
 * Uses Intersection Observer for better performance than scroll events
 */
const useShouldLoadChat = (options?: IntersectionObserverInit): boolean => {
  const [shouldLoad, setShouldLoad] = useState<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // If already loaded, don't re-initialize
    if (shouldLoad) return;

    // Create a trigger element at the bottom of the page
    const trigger = document.createElement('div');
    trigger.style.position = 'absolute';
    trigger.style.bottom = '1000px'; // Load chat when user is 1000px from bottom
    trigger.style.left = '0';
    trigger.style.width = '1px';
    trigger.style.height = '1px';
    trigger.style.pointerEvents = 'none';
    trigger.style.visibility = 'hidden';
    document.body.appendChild(trigger);
    triggerRef.current = trigger;

    // Also load after a timeout as fallback (user might not scroll)
    const timeoutId = setTimeout(() => {
      setShouldLoad(true);
    }, 3000);

    // Set up Intersection Observer
    const observerOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '0px 0px 1000px 0px', // Trigger when within 1000px of viewport bottom
      threshold: 0,
      ...options
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          clearTimeout(timeoutId);
          observerRef.current?.disconnect();
        }
      });
    }, observerOptions);

    observerRef.current.observe(trigger);

    return () => {
      clearTimeout(timeoutId);
      observerRef.current?.disconnect();
      if (triggerRef.current && document.body.contains(triggerRef.current)) {
        document.body.removeChild(triggerRef.current);
      }
    };
  }, [options, shouldLoad]);

  return shouldLoad;
};

/**
 * Lazy-loaded ChatWidget component with Intersection Observer trigger
 * Reduces initial bundle size by loading chat functionality only when:
 * 1. User scrolls near the bottom of the page, OR
 * 2. After 3 seconds as a fallback
 * 
 * Usage:
 * ```tsx
 * import { LazyChatWidget } from './components/chatbot/LazyChatWidget';
 * 
 * function App() {
 *   return <LazyChatWidget />;
 * }
 * ```
 */
const ChatWidgetComponent = lazy(() => 
  import('./ChatWidget').then(module => ({
    default: module.ChatWidget
  }))
);

export const LazyChatWidget: React.FC<ChatWidgetProps> = (props) => {
  const shouldLoad = useShouldLoadChat();

  if (!shouldLoad) {
    return <ChatWidgetFallback />;
  }

  return (
    <Suspense fallback={<ChatWidgetFallback />}>
      <ChatWidgetComponent {...props} />
    </Suspense>
  );
};

export default LazyChatWidget;
