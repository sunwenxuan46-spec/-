
import React from 'react';
import { Message, Role } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-4 shadow-sm ${
        isUser 
          ? 'bg-blue-600 text-white rounded-tr-none' 
          : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
      }`}>
        <div className="flex flex-col gap-3">
          {message.parts.map((part, idx) => (
            <div key={idx}>
              {part.inlineData && (
                <img 
                  src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} 
                  alt="Uploaded content" 
                  className="max-w-full rounded-lg mb-2 border border-slate-200"
                />
              )}
              {part.text && (
                <div className="whitespace-pre-wrap leading-relaxed text-[15px]">
                  {part.text}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={`text-[10px] mt-2 opacity-60 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
