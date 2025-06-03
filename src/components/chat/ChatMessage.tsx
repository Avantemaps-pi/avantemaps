
import React from 'react';
import { Avatar } from '@/components/ui/avatar';

interface ChatMessageProps {
  message: {
    id: number;
    text: string;
    sender: string;
    timestamp: string;
  };
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isAttachmentOptions = message.sender === 'attachment-options';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
        {!isUser && !isSystem && (
          <Avatar className="h-8 w-8 mt-1">
            <img src="/placeholder.svg" alt="Support" />
          </Avatar>
        )}
        
        <div className={`rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-primary text-primary-foreground ml-2' 
            : isSystem 
              ? 'bg-gray-100 text-gray-800 border'
              : isAttachmentOptions
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-muted text-muted-foreground mr-2'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
          <span className="text-xs opacity-70 mt-1 block">{message.timestamp}</span>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
