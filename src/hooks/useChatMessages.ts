
import { useState } from 'react';
import { ChatMessage, ChatMode } from '@/types/chat';
import { createChatMessage, getMenuOptionResponse, getInitialMessages } from '@/utils/chatMessageHandlers';

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages());
  const [awaitingVerificationConfirmation, setAwaitingVerificationConfirmation] = useState(false);
  const [awaitingBusinessSelection, setAwaitingBusinessSelection] = useState(false);

  const sendMenuOptionMessage = (option: string) => {
    const menuMessage = createChatMessage(
      messages.length + 1,
      option,
      "user"
    );
    
    setMessages(prev => [...prev, menuMessage]);
    
    // Add automated response based on the option
    setTimeout(() => {
      const responseText = getMenuOptionResponse(option);
      const responseMessage = createChatMessage(
        messages.length + 2,
        responseText,
        "support"
      );
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
  };

  const sendVerificationRequest = (type: 'verification' | 'certification') => {
    const requestMessage = createChatMessage(
      messages.length + 1,
      type === 'verification' ? "Requesting Verification" : "Requesting Certification",
      "user"
    );
    
    setMessages([...messages, requestMessage]);
    
    // Add a response
    setTimeout(() => {
      const responseMessage = createChatMessage(
        messages.length + 2,
        `Your ${type} request has been received. Our team will review your application and get back to you shortly.`,
        "support"
      );
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
  };

  const handleAttachmentOption = (type: string) => {
    console.log(`Attachment type selected: ${type}`);
    
    const requestMessage = createChatMessage(
      messages.length + 1,
      "Requesting to attach a file",
      "user"
    );
    
    setMessages([...messages, requestMessage]);
    
    // Add a response
    setTimeout(() => {
      const responseMessage = createChatMessage(
        messages.length + 2,
        "File attachment is currently unavailable in the demo version.",
        "support"
      );
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
  };

  const handleSendMessage = (message: string, chatMode: ChatMode) => {
    // Handle verification confirmation responses
    if (awaitingVerificationConfirmation) {
      if (message.toLowerCase().includes('yes') || message.toLowerCase() === 'y') {
        sendVerificationRequest('verification');
        setAwaitingVerificationConfirmation(false);
        return;
      } else if (message.toLowerCase().includes('no') || message.toLowerCase() === 'n') {
        const cancelMessage = createChatMessage(
          messages.length + 1,
          "Verification request cancelled.",
          "support"
        );
        setMessages([...messages, cancelMessage]);
        setAwaitingVerificationConfirmation(false);
        return;
      }
    }

    // Handle business selection for certification
    if (awaitingBusinessSelection) {
      const businessName = message.trim();
      const selectionMessage = createChatMessage(
        messages.length + 1,
        `Selected business: ${businessName}`,
        "user"
      );
      
      setMessages([...messages, selectionMessage]);
      
      setTimeout(() => {
        const responseMessage = createChatMessage(
          messages.length + 2,
          `Certification request for "${businessName}" has been received. Our team will review your application and get back to you shortly.`,
          "support"
        );
        setMessages(prev => [...prev, responseMessage]);
      }, 1000);
      
      setAwaitingBusinessSelection(false);
      return;
    }
    
    // Check for special commands
    if (message.includes('/verification')) {
      const confirmationMessage = createChatMessage(
        messages.length + 1,
        "Are you sure you want to request a new verification check? Yes | No",
        "support"
      );
      setMessages([...messages, confirmationMessage]);
      setAwaitingVerificationConfirmation(true);
      return;
    }
    
    if (message.includes('/certification')) {
      const businessSelectionMessage = createChatMessage(
        messages.length + 1,
        "Please select which business you'd like to certify:",
        "support"
      );
      
      const businessOptionsMessage = createChatMessage(
        messages.length + 2,
        "Available businesses:\n• Your Restaurant Name\n• Your Shop Name\n• Your Service Business\n\nPlease type the name of the business you want to certify:",
        "support"
      );
      
      setMessages([...messages, businessSelectionMessage, businessOptionsMessage]);
      setAwaitingBusinessSelection(true);
      return;
    }
    
    if (message.includes('/attach')) {
      handleAttachmentOption('default');
      return;
    }
    
    const newMessage = createChatMessage(
      messages.length + 1,
      message,
      "user"
    );
    
    setMessages([...messages, newMessage]);
    
    // Add a response based on chat mode
    setTimeout(() => {
      const responseMessage = createChatMessage(
        messages.length + 2,
        chatMode === "ai" 
          ? "This is an AI-generated response. How can I assist you further?"
          : "A live agent has received your message. We'll respond as soon as possible.",
        chatMode === "ai" ? "support" : "live-support"
      );
      setMessages(prev => [...prev, responseMessage]);
    }, 1000);
  };

  return {
    messages,
    setMessages,
    sendMenuOptionMessage,
    sendVerificationRequest,
    handleAttachmentOption,
    handleSendMessage,
    awaitingVerificationConfirmation,
    awaitingBusinessSelection
  };
};
