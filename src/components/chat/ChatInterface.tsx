import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import ChatModeToggle from './ChatModeToggle';
import ChatMessage from './ChatMessage';
import BusinessSelectionButtons from './BusinessSelectionButtons';
import VerificationResultCard, { VerificationMetrics } from './VerificationResultCard';
import type { ContactOTPResult } from './ContactOTPVerification';
import MessagesPanel from '@/components/messages/MessagesPanel';
import { useLocation } from '@/lib/router-compat';
import { Send, Image, Video, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isSafeForAI } from '@/utils/contentFilter';
import { toast } from 'sonner';
import { useStickToBottom } from '@/hooks/useStickToBottom';

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
    verificationMetrics?: VerificationMetrics | undefined;
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
  onSendContactOTP?: (email: string, businessId: number) => Promise<ContactOTPResult>;
  onVerifyContactOTP?: (email: string, otp: string, businessId: number) => Promise<ContactOTPResult>;
  /** Re-runs verification for a result card's business */
  onCheckVerificationAgain?: (businessId: number, businessName: string) => Promise<void>;
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
  onCheckVerificationAgain,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // "Check again" for a result card's business (none if the card doesn't know which)
  const checkAgainFor = (metrics: VerificationMetrics) => {
    const businessId = metrics.businessId;
    if (!onCheckVerificationAgain || businessId == null) return undefined;
    return () => onCheckVerificationAgain(businessId, metrics.businessName);
  };
  // Keep the newest message in view when the keyboard shrinks the list
  const listRef = useStickToBottom();
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
    <Card className="flex flex-1 min-h-0 flex-col overflow-hidden border-none rounded-none shadow-none sm:rounded-lg sm:shadow-md">
      <div className="flex flex-1 min-h-0 flex-col">
        {/* Bot/Messages switch; the page header is the only title */}
        <ChatModeToggle
          chatMode={chatMode}
          onChatModeChange={onChatModeChange}
          hasLiveChatAccess={hasLiveChatAccess}
        />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {chatMode === 'live' ? (
            <MessagesPanel
              initialConversationId={(location.state as any)?.openConversationId ?? null}
              initialInboxBusinessId={(location.state as any)?.inboxBusinessId ?? null}
            />
          ) : (
            <>
              <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-center text-muted-foreground">No messages yet. Start a conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map(msg => (
                      <div key={msg.id}>
                        {/* A verification result is just its card, no bubble */}
                        {!(msg.verificationMetrics && !msg.text) && (
                          <ChatMessage
                            id={msg.id}
                            text={msg.text}
                            sender={msg.sender}
                            timestamp={msg.timestamp}
                          />
                        )}
                        {msg.verificationMetrics && (
                          <div className={msg.text ? 'mt-2' : undefined}>
                            <VerificationResultCard
                              metrics={msg.verificationMetrics}
                              contactEmail={msg.contactVerification?.email}
                              contactBusinessId={msg.contactVerification?.businessId}
                              onSendContactOTP={onSendContactOTP}
                              onVerifyContactOTP={onVerifyContactOTP}
                              onCheckAgain={checkAgainFor(msg.verificationMetrics)}
                              animate={msg.animateVerification ?? false}
                            />
                            {!msg.text && <p className="mt-1 text-xs text-muted-foreground">{msg.timestamp}</p>}
                          </div>
                        )}
                        {renderBusinessSelectionButtons(msg)}
                      </div>
                    ))}

                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Quick replies sit with the input, above "Powered by" */}
              {showQuickChips && (
                <div className="flex flex-wrap gap-2 px-4 pt-2 pb-3">
                  {QUICK_REPLIES.map(text => (
                    <button
                      key={text}
                      type="button"
                      onClick={() => onChipClick(text)}
                      className="inline-flex min-h-11 items-center rounded-full border border-primary/30 bg-primary/5 px-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-4 pt-2 pb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground border-t">
                <Sparkles className="h-3 w-3" />
                <span>Powered by CommuniCon</span>
              </div>

              <div className="px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
      </div>
    </Card>
  );
};

export default ChatInterface;
