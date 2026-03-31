import React from 'react';
import { ChatMessage as ChatMessageType } from './types';


interface ChatMessageProps {
  message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === 'bot';
  const formattedTime = message.timestamp 
    ? new Intl.DateTimeFormat('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }).format(message.timestamp)
    : '';

  return (
    <div
      className={`flex gap-3 mb-4 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}
      data-role={message.role}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isBot 
            ? 'bg-blue-100 text-blue-600' 
            : 'bg-gray-200 text-gray-600'
        }`}
      >
        {isBot ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        )}
      </div>

      {/* Message bubble */}
      <div className={`flex flex-col max-w-[80%] ${isBot ? 'items-start' : 'items-end'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isBot
              ? 'bg-gray-100 text-gray-800 rounded-tl-sm'
              : 'bg-blue-600 text-white rounded-tr-sm'
          }`}
        >
          {message.content}
        </div>
        {formattedTime && (
          <span className="text-xs text-gray-400 mt-1 px-1">
            {formattedTime}
          </span>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
