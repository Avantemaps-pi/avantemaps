
export interface ChatMessage {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
}

export type ChatMode = 'ai' | 'live';
