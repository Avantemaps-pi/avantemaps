
import React from 'react';

export interface ChatMessageProps {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ text, sender, timestamp }) => {
  return (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[80%] px-4 py-2 rounded-lg ${
          sender === 'user' 
            ? 'bg-blue-500 text-white' 
            : sender === 'system'
              ? 'bg-gray-200 text-gray-800'
              : sender === 'live-support'
                ? 'bg-red-100 border border-red-300 text-gray-800'
                : 'bg-gray-100 text-gray-800'
        }`}
      >
        <p>{text}</p>
        <p className="text-xs mt-1 opacity-70">{timestamp}</p>
      </div>
    </div>
  );
};

export default ChatMessage;
