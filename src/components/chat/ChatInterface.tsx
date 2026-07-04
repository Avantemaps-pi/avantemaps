import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import ChatModeToggle from './ChatModeToggle';
import ChatMessage from './ChatMessage';
import BusinessSelectionButtons from './BusinessSelectionButtons';
import VerificationResultCard, { VerificationMetrics } from './VerificationResultCard';
import MessagesPanel from '@/components/messages/MessagesPanel';
import { useLocation } from 'react-router-dom';
import { Send, Image, Video, MessagesSquare, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isSafeForAI } from '@/utils/contentFilter';
import { toast } from 'sonner';

export type ChatMode = 'ai' | 'live';

interface ChatInterfaceProps {
  chatMode: 'ai' | 'live';
  onChatModeChange: (mode: 'ai' | 'live') => void;
  messages: Array<{
    id: number;
    text: string;
    sender: string;
    timestamp: string;
    businesses?: Array<{ id: number; business_name: string; verification_status?: string | null; is_verified?: boolean }>;
    verificationMetrics?: VerificationMetrics;
    contactVerification?: {
      email: string;
      businessId: number;
    };
    animateVerification?: boolean;
  }>;
  message: string;
  setMessage: (message: string) => void;
  handleSendMessage: () => void;
  handleQuickReply?: (text: string) => void;
  handleAttachmentOption?: () => void;
  showAttachmentIcon?: boolean;
  hasLiveChatAccess?: boolean;
  onSendContactOTP?: (email: string, businessId: number) => Promise<boolean>;
  onVerifyContactOTP?: (email: string, otp: string, businessId: number) => Promise<boolean>;
}

const QUICK_REPLIES = [
  'Check verification status',
  'Check certification status',
  'My listings',
];

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatMode,
  onChatModeChange,
  messages,
  message,
  setMessage,
  handleSendMessage,
  handleQuickReply,
  hasLiveChatAccess = false,
  onSendContactOTP,
  onVerifyContactOTP,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const location = useLocation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isInitialMount.current ? 'instant' : 'smooth' });
    isInitialMount.current = false;
  }, [messages]);

  const handleValidatedSendMessage = () => {
    if (!isSafeForAI(message)) {
      toast.error('Message contains inappropriate content or suspicious patterns.', { id: 'chat:content-filter', duration: 4000 });
      return;
    }
    handleSendMessage();
  };

  const onChipClick = (text: string) => {
    if (handleQuickReply) {
      handleQuickReply(text);
    } else {
      setMessage(text);
    }
  };

  const renderBusinessSelectionButtons = (msg: any) => {
    if (msg.sender === 'business-selection') {
      const businesses = msg.businesses || [];
      if (businesses.length === 0) return null;
      return (
        <BusinessSelectionButtons
          businesses={businesses}
          onBusinessSelect={(business) => {
            if (window.handleBusinessSelection) {
              window.handleBusinessSelection(business);
            }
          }}
        />
      );
    }
    return null;
  };

  // Show only the latest user message and all non-user messages aren't necessary;
  // alignment is handled inside ChatMessage based on sender.
  const showQuickChips = chatMode === 'ai' && messages.filter(m => m.sender === 'user').length === 0;

  return (
    <Card className="mt-6 overflow-hidden border-none shadow-md">
      <div className="flex h-full flex-col">
        {/* Branded header */}
        <div className="border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                <MessagesSquare className="h-4 w-4" />
              </div>
              <div className="leading-tight">
                <h3 className="font-semibold text-base">CommuniCon</h3>
                <p className="text-[11px] text-muted-foreground">Avante Maps communication hub</p>
              </div>
            </div>
            <ChatModeToggle
              chatMode={chatMode}
              onChatModeChange={onChatModeChange}
              hasLiveChatAccess={hasLiveChatAccess}
            />
          </div>
        </div>

        {chatMode === 'live' ? (
          <MessagesPanel
            initialConversationId={(location.state as any)?.openConversationId ?? null}
            initialInboxBusinessId={(location.state as any)?.inboxBusinessId ?? null}
          />
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[60vh] min-h-[400px]">
              {messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center text-muted-foreground">No messages yet. Start a conversation!</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <div key={msg.id}>
                      <ChatMessage
                        id={msg.id}
                        text={msg.text}
                        sender={msg.sender}
                        timestamp={msg.timestamp}
                      />
                      {msg.verificationMetrics && (
                        <div className="mt-2">
                          <VerificationResultCard
                            metrics={msg.verificationMetrics}
                            contactEmail={msg.contactVerification?.email}
                            contactBusinessId={msg.contactVerification?.businessId}
                            onSendContactOTP={onSendContactOTP}
                            onVerifyContactOTP={onVerifyContactOTP}
                            animate={msg.animateVerification ?? false}
                          />
                        </div>
                      )}
                      {renderBusinessSelectionButtons(msg)}
                    </div>
                  ))}

                  {showQuickChips && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {QUICK_REPLIES.map(text => (
                        <button
                          key={text}
                          type="button"
                          onClick={() => onChipClick(text)}
                          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          {text}
                        </button>
                      ))}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="px-4 pt-2 pb-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground border-t">
              <Sparkles className="h-3 w-3" />
              <span>Powered by CommuniCon</span>
            </div>

            <div className="p-3">
              <div className="relative flex items-center">
                <div className="flex w-full bg-muted/50 rounded-full px-4 py-3">
                  <Input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                    placeholder="Ask about your business..."
                    onKeyDown={e => e.key === 'Enter' && handleValidatedSendMessage()}
                  />
                  <button
                    onClick={handleValidatedSendMessage}
                    disabled={!message.trim()}
                    className="text-primary hover:text-primary/80 ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send size={20} className="transform rotate-45" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default ChatInterface;
