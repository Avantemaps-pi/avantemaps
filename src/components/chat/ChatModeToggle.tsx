import React from 'react';
import { Bot, MessageSquare } from 'lucide-react';
import { ChatMode } from './ChatInterface';

interface ChatModeToggleProps {
  chatMode: ChatMode;
  onChatModeChange: (value: string) => void;
  hasLiveChatAccess?: boolean;
}

const ChatModeToggle: React.FC<ChatModeToggleProps> = ({
  chatMode,
  onChatModeChange,
}) => {
  return (
    <div className="flex items-center bg-muted rounded-full p-1 gap-0.5">
      <button
        type="button"
        onClick={() => onChatModeChange('ai')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          chatMode === 'ai'
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Bot className="h-3.5 w-3.5" />
        Bot
      </button>

      <button
        type="button"
        onClick={() => onChatModeChange('live')}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
          chatMode === 'live'
            ? 'bg-primary text-primary-foreground shadow-xs'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Messages
      </button>
    </div>
  );
};

export default ChatModeToggle;
