
import React from 'react';
import { Radio, Bot } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChatMode } from './ChatInterface';

interface ChatModeToggleProps {
  chatMode: ChatMode;
  onChatModeChange: (value: string) => void;
}

const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ chatMode, onChatModeChange }) => {
  return (
    <ToggleGroup 
      type="single" 
      variant="outline"
      value={chatMode}
      onValueChange={onChatModeChange}
      className="border rounded-md"
    >
      <ToggleGroupItem 
        value="ai" 
        className={`px-3 py-1 text-xs ${chatMode === "ai" ? "bg-green-500 text-white hover:bg-green-600" : ""}`}
      >
        <Bot className="h-4 w-4 mr-1" />
        AI
      </ToggleGroupItem>
      <ToggleGroupItem 
        value="live" 
        className={`px-3 py-1 text-xs ${chatMode === "live" ? "bg-red-500 text-white hover:bg-red-600" : ""}`}
      >
        <Radio className="h-4 w-4 mr-1" />
        LIVE
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default ChatModeToggle;
