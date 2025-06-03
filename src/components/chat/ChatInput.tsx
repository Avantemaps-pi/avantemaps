
import React, { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

const ChatInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttachmentClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  showAttachmentIcon?: boolean;
}> = ({
  value,
  onChange,
  onSubmit,
  onAttachmentClick,
  placeholder = 'Type a message...',
  disabled = false,
  showAttachmentIcon = true  // Changed back to true as default
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div className="flex items-end space-x-2 bg-background p-4 border-t">
      <Avatar className="hidden sm:flex h-9 w-9">
        <img src="/placeholder.svg" alt="User" />
      </Avatar>
      
      <div className="relative flex-1">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-h-[80px] pr-20 resize-none"
          disabled={disabled}
        />
        
        <div className="absolute right-3 bottom-3 flex space-x-2">
          {showAttachmentIcon && onAttachmentClick && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={onAttachmentClick}
              className="h-8 w-8"
              disabled={disabled}
            >
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Add attachment</span>
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            onClick={onSubmit}
            className="h-8 w-8 bg-primary text-primary-foreground"
            disabled={!value.trim() || disabled}
          >
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
