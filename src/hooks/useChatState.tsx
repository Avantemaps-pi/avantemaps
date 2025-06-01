
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMode } from '@/components/chat/ChatInterface';

export function useChatState() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Array<{
    id: number;
    text: string;
    sender: string;
    timestamp: string;
  }>>([
    { id: 1, text: "Welcome to Avante Maps!", sender: "system", timestamp: "10:30 AM" },
    { id: 2, text: "Hi there! How can I help with Avante Maps today?", sender: "support", timestamp: "10:32 AM" },
  ]);
  const [chatMode, setChatMode] = useState<ChatMode>("ai");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Check for special commands
      if (message.includes('/verification')) {
        sendVerificationRequest('verification');
        setMessage("");
        return;
      }
      
      if (message.includes('/certification')) {
        sendVerificationRequest('certification');
        setMessage("");
        return;
      }
      
      if (message.includes('/attach')) {
        // Handle attachment request
        if (handleAttachmentOption) {
          handleAttachmentOption('default');
        }
        setMessage("");
        return;
      }
      
      const newMessage = {
        id: messages.length + 1,
        text: message,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages([...messages, newMessage]);
      
      // Add a response based on chat mode
      setTimeout(() => {
        const responseMessage = {
          id: messages.length + 2,
          text: chatMode === "ai" 
            ? "This is an AI-generated response. How can I assist you further?"
            : "A live agent has received your message. We'll respond as soon as possible.",
          sender: chatMode === "ai" ? "support" : "live-support",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, responseMessage]);
      }, 1000);
      
      setMessage("");
    }
  };

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

  const handleAttachmentOption = (type: string) => {
    console.log(`Attachment type selected: ${type}`);
    // Implement actual attachment handling logic here
    
    const requestMessage = {
      id: messages.length + 1,
      text: "Requesting to attach a file",
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, requestMessage]);
    
    // Add a response
    setTimeout(() => {
      const responseMessage = {
        id: messages.length + 2,
        text: "File attachment is currently unavailable in the demo version.",
        sender: "support",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
  };

  const sendVerificationRequest = (type: 'verification' | 'certification') => {
    const requestMessage = {
      id: messages.length + 1,
      text: type === 'verification' ? "Requesting Verification" : "Requesting Certification",
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, requestMessage]);
    
    // Add a response
    setTimeout(() => {
      const responseMessage = {
        id: messages.length + 2,
        text: `Your ${type} request has been received. Our team will review your application and get back to you shortly.`,
        sender: "support",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
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
    sendVerificationRequest
  };
}
