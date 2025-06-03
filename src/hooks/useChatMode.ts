
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMode } from '@/types/chat';

export const useChatMode = () => {
  const navigate = useNavigate();
  const [chatMode, setChatMode] = useState<ChatMode>("ai");

  const handleChatModeChange = (value: string) => {
    if (value && value !== chatMode) {
      if (value === "live") {
        // Redirect to pricing page when switching to LIVE chat
        // Pass state to indicate we're coming from live chat and should scroll to organization tier
        navigate("/pricing", { state: { fromLiveChat: true } });
      } else {
        setChatMode(value as ChatMode);
      }
    }
  };

  return {
    chatMode,
    setChatMode,
    handleChatModeChange
  };
};
