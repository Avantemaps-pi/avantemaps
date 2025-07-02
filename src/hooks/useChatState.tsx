
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
  const [awaitingVerificationConfirmation, setAwaitingVerificationConfirmation] = useState(false);
  const [awaitingBusinessSelection, setAwaitingBusinessSelection] = useState(false);
  const [awaitingVerificationBusinessSelection, setAwaitingVerificationBusinessSelection] = useState(false);

  // Mock businesses data - in a real app this would come from a database
  const mockBusinesses = [
    { id: 1, name: "Your Restaurant Name" },
    { id: 2, name: "Your Shop Name" },
    { id: 3, name: "Your Service Business" }
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Handle business selection for verification
      if (awaitingVerificationBusinessSelection) {
        const selectedBusiness = mockBusinesses.find(business => 
          business.name.toLowerCase().includes(message.toLowerCase()) ||
          message.toLowerCase().includes(business.name.toLowerCase())
        );
        
        if (selectedBusiness) {
          const selectionMessage = {
            id: messages.length + 1,
            text: `Selected business: ${selectedBusiness.name}`,
            sender: "user",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          setMessages([...messages, selectionMessage]);
          
          setTimeout(() => {
            const confirmationMessage = {
              id: messages.length + 2,
              text: `Request a new verification check for "${selectedBusiness.name}"? Yes | No`,
              sender: "support",
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, confirmationMessage]);
          }, 500);
          
          setAwaitingVerificationBusinessSelection(false);
          setAwaitingVerificationConfirmation(true);
          setMessage("");
          return;
        } else {
          const errorMessage = {
            id: messages.length + 1,
            text: "Business not found. Please select from the available options:",
            sender: "support",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages([...messages, errorMessage]);
          setMessage("");
          return;
        }
      }

      // Handle verification confirmation responses
      if (awaitingVerificationConfirmation) {
        if (message.toLowerCase().includes('yes') || message.toLowerCase() === 'y') {
          sendVerificationRequest('verification');
          setAwaitingVerificationConfirmation(false);
          setMessage("");
          return;
        } else if (message.toLowerCase().includes('no') || message.toLowerCase() === 'n') {
          const cancelMessage = {
            id: messages.length + 1,
            text: "Verification request cancelled.",
            sender: "support",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages([...messages, cancelMessage]);
          setAwaitingVerificationConfirmation(false);
          setMessage("");
          return;
        }
      }

      // Handle business selection for certification
      if (awaitingBusinessSelection) {
        // Mock business selection logic
        const businessName = message.trim();
        const selectionMessage = {
          id: messages.length + 1,
          text: `Selected business: ${businessName}`,
          sender: "user",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages([...messages, selectionMessage]);
        
        setTimeout(() => {
          const responseMessage = {
            id: messages.length + 2,
            text: `Certification request for "${businessName}" has been received. Our team will review your application and get back to you shortly.`,
            sender: "support",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, responseMessage]);
        }, 1000);
        
        setAwaitingBusinessSelection(false);
        setMessage("");
        return;
      }
      
      // Check for special commands
      if (message.includes('/verification')) {
        // Show business selection buttons for verification
        const businessSelectionMessage = {
          id: messages.length + 1,
          text: "Please select which business you'd like to verify:",
          sender: "support",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const businessOptionsMessage = {
          id: messages.length + 2,
          text: "Select your business:",
          sender: "business-selection",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages([...messages, businessSelectionMessage, businessOptionsMessage]);
        setAwaitingVerificationBusinessSelection(true);
        setMessage("");
        return;
      }
      
      if (message.includes('/certification')) {
        // Show business selection for certification
        const businessSelectionMessage = {
          id: messages.length + 1,
          text: "Please select which business you'd like to certify:",
          sender: "support",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const businessOptionsMessage = {
          id: messages.length + 2,
          text: "Available businesses:\n" + mockBusinesses.map(b => `• ${b.name}`).join('\n') + "\n\nPlease type the name of the business you want to certify:",
          sender: "support",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages([...messages, businessSelectionMessage, businessOptionsMessage]);
        setAwaitingBusinessSelection(true);
        setMessage("");
        return;
      }
      
      if (message.includes('/attach')) {
        // Handle attachment request - show options
        const systemMessage = {
          id: messages.length + 1,
          text: "Please select an attachment type:",
          sender: "system",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        const optionsMessage = {
          id: messages.length + 2,
          text: "Choose your attachment type:",
          sender: "attachment-options",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setMessages([...messages, systemMessage, optionsMessage]);
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

  // Handle business selection from buttons
  const handleBusinessSelection = (business: { id: number; name: string }) => {
    if (awaitingVerificationBusinessSelection) {
      const selectionMessage = {
        id: messages.length + 1,
        text: `Selected business: ${business.name}`,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, selectionMessage]);
      
      setTimeout(() => {
        const confirmationMessage = {
          id: messages.length + 2,
          text: `Request a new verification check for "${business.name}"? Yes | No`,
          sender: "support",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, confirmationMessage]);
      }, 500);
      
      setAwaitingVerificationBusinessSelection(false);
      setAwaitingVerificationConfirmation(true);
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
    handleBusinessSelection
  };
}
