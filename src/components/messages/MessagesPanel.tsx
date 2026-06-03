import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth';
import { useMessages, type Inbox } from '@/hooks/useMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Lock, MessageSquare, User as UserIcon, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type OwnedBusiness = { id: number; business_name: string };

interface MessagesPanelProps {
  initialConversationId?: string | null;
  initialInboxBusinessId?: number | null;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const MessagesPanel: React.FC<MessagesPanelProps> = ({
  initialConversationId,
  initialInboxBusinessId,
}) => {
  const { user } = useAuth();
  const uid = user?.uid;
  const navigate = useNavigate();
  const [ownedBusinesses, setOwnedBusinesses] = useState<OwnedBusiness[]>([]);
  const [inboxKey, setInboxKey] = useState<string>(
    initialInboxBusinessId ? `b:${initialInboxBusinessId}` : 'customer',
  );
  const [draft, setDraft] = useState('');
  const initOpenedRef = useRef(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data } = await supabase
        .from('businesses')
        .select('id,business_name')
        .eq('owner_id', uid)
        .order('business_name');
      setOwnedBusinesses(data ?? []);
    })();
  }, [uid]);

  const inbox: Inbox | null = useMemo(() => {
    if (!uid) return null;
    if (inboxKey === 'customer') return { kind: 'customer' };
    const businessId = parseInt(inboxKey.replace('b:', ''), 10);
    return { kind: 'business', businessId };
  }, [inboxKey, uid]);

  const {
    conversations,
    activeConvId,
    setActiveConvId,
    messages,
    loadingConvs,
    loadingMsgs,
    hasPaidSub,
    isVerifiedSender,
    feePi,
    feeUsd,
    paying,
    openConversation,
    sendMessage,
  } = useMessages(inbox);

  // Auto-open initial conversation once
  useEffect(() => {
    if (initOpenedRef.current) return;
    if (!initialConversationId) return;
    if (loadingConvs) return;
    const match = conversations.find((c) => c.id === initialConversationId);
    if (match) {
      initOpenedRef.current = true;
      openConversation(initialConversationId);
    } else {
      initOpenedRef.current = true;
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'error',
          event: 'communicon.live_open.failed',
          fn: 'MessagesPanel.autoOpenInitialConversation',
          reason: 'conversation_not_found',
          openConversationId: initialConversationId,
          initialInboxBusinessId: initialInboxBusinessId ?? null,
          userId: uid ?? null,
          inboxKind: inbox?.kind ?? null,
          inboxBusinessId: inbox?.kind === 'business' ? inbox.businessId : null,
          conversationCount: conversations.length,
          conversationIdsSample: conversations.slice(0, 5).map((c) => c.id),
        }),
      );
      toast.error("Couldn't open the conversation. Please try again.", {
        id: 'msg:open-conv-missing',
        description: 'The conversation could not be found. It may have been deleted or you may not have access.',
        duration: 5000,
      });
    }
  }, [initialConversationId, conversations, loadingConvs, openConversation]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]);

  const handleSend = async () => {
    const ok = await sendMessage(draft);
    if (ok) setDraft('');
  };

  const isBusinessInbox = inbox?.kind === 'business';
  const canReply = !isBusinessInbox || hasPaidSub;

  const activeConv = conversations.find((c) => c.id === activeConvId);

  if (!uid) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
        <p className="text-sm text-muted-foreground">Sign in to use messages.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[400px] max-h-[60vh] flex-1">
      {/* Inbox switcher */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <Select value={inboxKey} onValueChange={(v) => { setInboxKey(v); setActiveConvId(null); }}>
          <SelectTrigger className="h-8 text-xs w-full max-w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">
              <span className="flex items-center gap-2">
                <UserIcon className="h-3.5 w-3.5" /> My messages
              </span>
            </SelectItem>
            {ownedBusinesses.map((b) => (
              <SelectItem key={b.id} value={`b:${b.id}`}>
                <span className="flex items-center gap-2">
                  <Store className="h-3.5 w-3.5" /> {b.business_name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Body */}
      {!activeConvId ? (
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-3">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isBusinessInbox
                  ? 'No customer messages yet for this business.'
                  : 'No conversations yet. Open a business listing and tap Message to start one.'}
              </p>
              {!isBusinessInbox && (
                <Button size="sm" variant="outline" onClick={() => navigate('/')}>
                  Browse businesses
                </Button>
              )}
            </div>
          ) : (
            <ul className="divide-y">
              {conversations.map((c) => {
                const unread = isBusinessInbox ? c.business_unread : c.customer_unread;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className="w-full flex items-start gap-3 px-3 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                        {isBusinessInbox ? <UserIcon className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {isBusinessInbox
                              ? `Customer ${c.customer_id.slice(0, 6)}`
                              : c.business_name ?? `Business #${c.business_id}`}
                          </p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {formatTime(c.last_message_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {c.last_message_preview ?? 'No messages yet'}
                        </p>
                      </div>
                      {unread > 0 && (
                        <Badge className="h-5 min-w-5 px-1.5 text-[10px]">{unread}</Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setActiveConvId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <p className="text-sm font-medium truncate">
              {isBusinessInbox
                ? `Customer ${activeConv?.customer_id.slice(0, 6) ?? ''}`
                : activeConv?.business_name ?? 'Conversation'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loadingMsgs ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">
                Say hello to start the conversation.
              </p>
            ) : (
              messages.map((m) => {
                const mine =
                  (inbox?.kind === 'customer' && m.sender_role === 'customer') ||
                  (inbox?.kind === 'business' && m.sender_role === 'business');
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${mine ? 'opacity-80' : 'opacity-60'}`}>
                        {formatTime(m.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {!canReply ? (
            <div className="border-t bg-muted/40 p-3 flex items-center gap-2 text-xs">
              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground flex-1">
                Replying as a business requires a paid plan. You can still see how many
                messages you've received.
              </span>
              <Button size="sm" variant="default" onClick={() => navigate('/pricing')}>
                Upgrade
              </Button>
            </div>
          ) : (
            <div className="border-t p-3 space-y-2">
              {!isBusinessInbox && !isVerifiedSender && (
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1.5">
                  <Lock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span className="flex-1">
                    Sending costs <span className="font-medium text-foreground">π {feePi}</span>
                    {feeUsd > 0 && <> (~${feeUsd.toFixed(2)})</>} per message.
                    Verify or certify a business to message for free.
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={isBusinessInbox ? 'Reply as your business...' : 'Type a message...'}
                  className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={paying}
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim() || paying}
                  className="text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} className="transform rotate-45" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MessagesPanel;
