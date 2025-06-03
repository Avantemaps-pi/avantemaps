
import React from 'react';
import { Card } from '@/components/ui/card';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatModeToggle from './ChatModeToggle';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMode, ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatInterfaceProps {
  chatMode: ChatMode;
  onChatModeChange: (mode: string) => void;
  messages: ChatMessageType[];
  message: string;
  setMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleAttachmentOption: () => void;
  showAttachmentIcon?: boolean;
  sendMenuOptionMessage?: (option: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatMode,
  onChatModeChange,
  messages,
  message,
  setMessage,
  handleSendMessage,
  handleAttachmentOption,
  showAttachmentIcon = false,
  sendMenuOptionMessage
}) => {
  // Menu options for quick access
  const menuOptions = ['Verification', 'Certification', 'Support', 'Feedback'];

  return (
    <Card className="h-[600px] flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Avante Maps Support</h3>
          <ChatModeToggle chatMode={chatMode} onChatModeChange={onChatModeChange} />
        </div>
        
        {/* Menu Options */}
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="text-sm text-gray-600 mr-2">Quick Menu:</span>
          {menuOptions.map((option) => (
            <button
              key={option}
              onClick={() => sendMenuOptionMessage?.(option)}
              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded-full transition-colors"
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage 
              key={msg.id} 
              id={msg.id}
              text={msg.text}
              sender={msg.sender}
              timestamp={msg.timestamp}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <ChatInput
          value={message}
          onChange={setMessage}
          onSubmit={handleSendMessage}
          onAttachmentClick={handleAttachmentOption}
          showAttachmentIcon={showAttachmentIcon}
        />
      </div>
    </Card>
  );
};

export default ChatInterface;
