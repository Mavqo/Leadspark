import React from 'react';
import { ChatMessage as ChatMessageType } from './types';
import { Stethoscope, User } from 'lucide-react';

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
          <Stethoscope className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
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
