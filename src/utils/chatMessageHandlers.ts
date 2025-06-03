
import { ChatMessage } from '@/types/chat';

export const createChatMessage = (
  id: number,
  text: string,
  sender: string
): ChatMessage => ({
  id,
  text,
  sender,
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
});

export const getMenuOptionResponse = (option: string): string => {
  switch (option.toLowerCase()) {
    case "verification":
      return "I can help you with business verification. Would you like me to start the verification process for your business?";
    case "certification":
      return "Business certification helps establish trust with customers. Which business would you like to certify?";
    case "support":
      return "I'm here to provide support! What specific issue can I help you with today?";
    case "feedback":
      return "We value your feedback! Please share your thoughts about Avante Maps and how we can improve.";
    default:
      return `You selected: ${option}. How can I assist you with this?`;
  }
};

export const getInitialMessages = (): ChatMessage[] => [
  { id: 1, text: "Welcome to Avante Maps!", sender: "system", timestamp: "10:30 AM" },
  { id: 2, text: "Hi there! How can I help with Avante Maps today?", sender: "support", timestamp: "10:32 AM" },
];
