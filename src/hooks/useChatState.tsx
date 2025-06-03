
import { useState } from 'react';
import { useChatMode } from './useChatMode';
import { useChatMessages } from './useChatMessages';

export function useChatState() {
  const [message, setMessage] = useState("");
  const { chatMode, setChatMode, handleChatModeChange } = useChatMode();
  const {
    messages,
    setMessages,
    sendMenuOptionMessage,
    sendVerificationRequest,
    handleAttachmentOption,
    handleSendMessage: handleMessageSend
  } = useChatMessages();

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      handleMessageSend(message, chatMode);
      setMessage("");
    }
  };

  return {
    message,
    setMessage,
    messages,
    setMessages,
    chatMode,
    setChatMode,
    handleSendMessage,
    handleChatModeChange,
    handleAttachmentOption,
    sendVerificationRequest,
    sendMenuOptionMessage
  };
}
