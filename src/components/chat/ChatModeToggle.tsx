
import React from 'react';
import { Radio, Bot, Lock } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChatMode } from './ChatInterface';

interface ChatModeToggleProps {
  chatMode: ChatMode;
  onChatModeChange: (value: string) => void;
  hasLiveChatAccess?: boolean;
}

const ChatModeToggle: React.FC<ChatModeToggleProps> = ({ 
  chatMode, 
  onChatModeChange,
  hasLiveChatAccess = false 
}) => {
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
        Bot
      </ToggleGroupItem>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ToggleGroupItem 
              value="live" 
              disabled={!hasLiveChatAccess}
              className={`px-3 py-1 text-xs ${chatMode === "live" ? "bg-red-500 text-white hover:bg-red-600" : ""} ${!hasLiveChatAccess ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Radio className="h-4 w-4 mr-1" />
              LIVE
              {!hasLiveChatAccess && <Lock className="h-3 w-3 ml-1" />}
            </ToggleGroupItem>
          </TooltipTrigger>
          {!hasLiveChatAccess && (
            <TooltipContent>
              <p>Requires Organization subscription</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </ToggleGroup>
  );
};

export default ChatModeToggle;
