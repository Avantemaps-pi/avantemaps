import React from 'react';
import ReactMarkdown from 'react-markdown';

export interface ChatMessageProps {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
}

const TypingDots: React.FC = () => (
  <span className="inline-flex gap-1 items-center py-1" aria-label="Assistant is typing">
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.3s]" />
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:-0.15s]" />
    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce" />
  </span>
);

const ChatMessage: React.FC<ChatMessageProps> = ({ text, sender, timestamp }) => {
  const isUser = sender === 'user';
  const isAssistant = sender === 'ai' || sender === 'support' || sender === 'system' || sender === 'live-support';
  const isStreamingPlaceholder = sender === 'ai' && text === '';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-lg transition-opacity ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : sender === 'system'
              ? 'bg-gray-200 text-gray-800'
              : sender === 'live-support'
                ? 'bg-red-100 border border-red-300 text-gray-800'
                : 'bg-gray-100 text-gray-800'
        }`}
      >
        {isStreamingPlaceholder ? (
          <TypingDots />
        ) : isUser ? (
          <p className="whitespace-pre-wrap break-words">{text}</p>
        ) : (
          <div className="prose prose-sm max-w-none break-words prose-p:my-1 prose-pre:my-2 prose-ul:my-1 prose-ol:my-1 prose-headings:my-2">
            <ReactMarkdown>{text}</ReactMarkdown>
            {sender === 'ai' && (
              <span className="inline-block w-1.5 h-4 -mb-0.5 ml-0.5 bg-current opacity-0 [animation:blink_1s_steps(2)_infinite] data-[streaming=true]:opacity-60" />
            )}
          </div>
        )}
        <p className={`text-xs mt-1 ${isUser ? 'opacity-80' : 'opacity-70'}`}>{timestamp}</p>
      </div>
    </div>
  );
};

export default React.memo(ChatMessage);
