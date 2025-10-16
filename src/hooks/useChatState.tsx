
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { filterInappropriateContent, isSafeForAI } from '@/utils/contentFilter';
import { useToast } from '@/hooks/use-toast';
import { ChatMode } from '@/components/chat/ChatInterface';

export function useChatState() {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const streamAIResponse = async (conversationMessages: typeof messages) => {
    try {
      const aiMessageId = conversationMessages.length + 1;
      const aiMessage = {
        id: aiMessageId,
        text: "",
        sender: "ai",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, aiMessage]);

      const apiMessages = conversationMessages
        .filter(msg => msg.sender === 'user' || msg.sender === 'ai')
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

      const CHAT_URL = `https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/chat-ai`;

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI service error');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      let accumulatedText = '';

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulatedText += content;
              
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, text: accumulatedText }
                    : msg
                )
              );
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulatedText += content;
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, text: accumulatedText }
                    : msg
                )
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch (error) {
      console.error('Error streaming AI response:', error);
      toast({
        title: "AI Error",
        description: error instanceof Error ? error.message : "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      
      setMessages(prev => prev.filter(msg => !(msg.sender === 'ai' && msg.text === '')));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Filter and validate message for AI mode
      if (chatMode === "ai" && !isSafeForAI(message.trim())) {
        toast({
          title: "Message blocked",
          description: "Your message contains inappropriate content or patterns. Please rephrase.",
          variant: "destructive",
        });
        return;
      }

      const filteredMessage = chatMode === "ai" ? filterInappropriateContent(message.trim()) : message.trim();

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
        text: filteredMessage,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const updatedMessages = [...messages, newMessage];
      setMessages(updatedMessages);
      setMessage("");
      
      // Handle AI mode with streaming
      if (chatMode === "ai") {
        await streamAIResponse(updatedMessages);
      } else {
        // LIVE mode - placeholder
        setTimeout(() => {
          const responseMessage = {
            id: updatedMessages.length + 1,
            text: "A live agent has received your message. We'll respond as soon as possible.",
            sender: "live-support",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, responseMessage]);
        }, 1000);
      }
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
