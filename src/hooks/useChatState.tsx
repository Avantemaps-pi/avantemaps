
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { ChatMode } from '@/components/chat/ChatInterface';

export function useChatState() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [awaitingVerificationConfirmation, setAwaitingVerificationConfirmation] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Handle verification confirmation responses
      if (awaitingVerificationConfirmation) {
        if (message.toLowerCase().includes('yes')) {
          sendVerificationRequest('verification');
          setAwaitingVerificationConfirmation(false);
        } else if (message.toLowerCase().includes('no')) {
          const cancelMessage = {
            id: messages.length + 1,
            text: "Verification request cancelled.",
            sender: "support",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, cancelMessage]);
          setAwaitingVerificationConfirmation(false);
        }
        setMessage("");
        return;
      }
      
      // Check for special commands
      if (message.includes('/verification')) {
        showVerificationConfirmation();
        setMessage("");
        return;
      }
      
      if (message.includes('/certification')) {
        showBusinessSelectionForCertification();
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

  const showVerificationConfirmation = () => {
    const confirmationMessage = {
      id: messages.length + 1,
      text: "Are you sure you want to request a new verification check? Yes | No",
      sender: "support",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, confirmationMessage]);
    setAwaitingVerificationConfirmation(true);
  };

  const showBusinessSelectionForCertification = () => {
    // Mock registered businesses - in a real app, this would come from the user's data
    const mockBusinesses = [
      "Downtown Coffee Shop",
      "Main Street Bakery",
      "Tech Solutions LLC"
    ];

    const businessListMessage = {
      id: messages.length + 1,
      text: `Please select which business you'd like to certify:\n\n${mockBusinesses.map((business, index) => `${index + 1}. ${business}`).join('\n')}`,
      sender: "support",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, businessListMessage]);
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
