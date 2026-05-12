
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
            <div className="relative">
              <ToggleGroupItem 
                value="live" 
                aria-disabled={!hasLiveChatAccess}
                className={`px-3 py-1 text-xs ${chatMode === "live" ? "bg-red-500 text-white hover:bg-red-600" : ""} ${!hasLiveChatAccess ? "opacity-60" : ""}`}
              >
                <Radio className="h-4 w-4 mr-1" />
                LIVE
                {!hasLiveChatAccess && <Lock className="h-3 w-3 ml-1" />}
              </ToggleGroupItem>
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-md backdrop-blur-sm bg-background/40 cursor-not-allowed"
              />
            </div>
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
