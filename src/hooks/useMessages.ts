import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth';
import { toast } from 'sonner';
import {
  enqueuePendingConversation,
  setConversationRunner,
} from '@/lib/pendingConversationQueue';
import { useVerifiedSender } from '@/hooks/useVerifiedSender';
import { useMessageFee } from '@/hooks/useMessageFee';
import { startPayment } from '@/utils/piPayment/payments';
import { approvePayment, completePayment } from '@/api/payments';
import { generateLifecycleId } from '@/utils/correlation';

export interface Conversation {
  id: string;
  business_id: number;
  customer_id: string;
  last_message_at: string;
  last_message_preview: string | null;
  customer_unread: number;
  business_unread: number;
  created_at: string;
  business_name?: string;
  business_image?: string | null;
  customer_username?: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'customer' | 'business';
  body: string;
  read_at: string | null;
  created_at: string;
}

export type Inbox =
  | { kind: 'customer' }
  | { kind: 'business'; businessId: number };

const PAID_PLANS = new Set(['small-business', 'small_business', 'organization']);

export function useMessages(inbox: Inbox | null) {
  const { user, login } = useAuth();
  const uid = user?.uid;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasPaidSub, setHasPaidSub] = useState(false);
  const channelRef = useRef<any>(null);
  const { isVerifiedSender } = useVerifiedSender();
  const { feePi, feeUsd } = useMessageFee();
  const [paying, setPaying] = useState(false);


  // Check subscription (for business reply gating UI)
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan,end_date')
        .eq('user_id', uid)
        .order('start_date', { ascending: false })
        .limit(1);
      const row = data?.[0];
      const active =
        !!row &&
        PAID_PLANS.has((row.plan ?? '').toString()) &&
        (!row.end_date || new Date(row.end_date) > new Date());
      setHasPaidSub(active);
    })();
  }, [uid]);

  const loadConversations = useCallback(async () => {
    if (!uid || !inbox) return;
    setLoadingConvs(true);
    let query = supabase
      .from('conversations')
      .select('*, businesses:business_id(business_name,images)')
      .order('last_message_at', { ascending: false });

    if (inbox.kind === 'customer') {
      query = query.eq('customer_id', uid);
    } else {
      query = query.eq('business_id', inbox.businessId);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast.error('Failed to load conversations');
      setLoadingConvs(false);
      return;
    }
    const mapped: Conversation[] = (data ?? []).map((r: any) => ({
      ...r,
      business_name: r.businesses?.business_name,
      business_image: r.businesses?.images?.[0] ?? null,
    }));
    setConversations(mapped);
    setLoadingConvs(false);
  }, [uid, inbox]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime: refresh on new messages affecting any of our conversations
  useEffect(() => {
    if (!uid || !inbox) return;
    const channel = supabase
      .channel(`messages-${inbox.kind === 'customer' ? `c-${uid}` : `b-${inbox.businessId}`}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as MessageRow;
          setMessages((prev) =>
            msg.conversation_id === activeConvId && !prev.some((m) => m.id === msg.id)
              ? [...prev, msg]
              : prev,
          );
          loadConversations();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadConversations(),
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, inbox, activeConvId, loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Failed to load messages');
      setLoadingMsgs(false);
      return;
    }
    setMessages((data ?? []) as MessageRow[]);
    setLoadingMsgs(false);
  }, []);

  const openConversation = useCallback(
    async (convId: string) => {
      setActiveConvId(convId);
      await loadMessages(convId);
      // Reset unread for this side
      if (!inbox || !uid) return;
      const update =
        inbox.kind === 'customer'
          ? { customer_unread: 0 }
          : { business_unread: 0 };
      await supabase.from('conversations').update(update).eq('id', convId);
      loadConversations();
    },
    [loadMessages, inbox, uid, loadConversations],
  );

  const startConversationWithBusiness = useCallback(
    async (businessId: number, isRetry = false): Promise<string | null> => {
      const ctxBase = { businessId, localUid: uid ?? null, isRetry };
      if (!uid) {
        console.warn('[startConversationWithBusiness] no local uid', ctxBase);
        toast.error('Please sign in first');
        return null;
      }

      // Helper: trigger re-auth and hand the request to the global
      // PendingConversationDispatcher, which will retry it as soon as
      // onAuthStateChange reports a fresh session.
      const reAuthAndRetry = async (
        reason: string,
      ): Promise<string | null> => {
        if (isRetry) {
          console.error(
            '[startConversationWithBusiness] retry after re-auth still failing',
            { ...ctxBase, reason },
          );
          toast.error('Still signed out after re-auth. Please try again.');
          return null;
        }
        const toastId = toast.loading('Signing you back in…');
        // Queue the request *before* kicking off login so the dispatcher
        // picks it up the moment SIGNED_IN / TOKEN_REFRESHED fires.
        const pending = enqueuePendingConversation(businessId);
        login()
          .then(() => {
            toast.success('Signed back in — resuming…', { id: toastId });
          })
          .catch((err) => {
            console.error('[startConversationWithBusiness] re-auth failed', {
              ...ctxBase,
              reason,
              err,
            });
            toast.error('Sign-in failed. Please try again.', { id: toastId });
          });
        return pending;
      };


      // Ensure a live Supabase auth session exists, otherwise RLS
      // (customer_id = auth.uid()) will reject the insert.
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      const authUid = sessionData?.session?.user?.id ?? null;
      const ctx = { ...ctxBase, authUid, sessionError: sessionError?.message };
      if (!authUid) {
        console.warn('[startConversationWithBusiness] no Supabase session', ctx);
        return reAuthAndRetry('missing-session');
      }
      if (authUid !== uid) {
        console.error(
          '[startConversationWithBusiness] uid mismatch between local user and Supabase session',
          ctx,
        );
        return reAuthAndRetry('uid-mismatch');
      }

      // Try to find existing
      const { data: existing, error: existingError } = await supabase
        .from('conversations')
        .select('id')
        .eq('business_id', businessId)
        .eq('customer_id', authUid)
        .maybeSingle();
      if (existingError) {
        console.error(
          '[startConversationWithBusiness] lookup failed',
          { ...ctx, pgError: existingError },
        );
        toast.error(
          `Conversation lookup failed: ${existingError.message} (code ${existingError.code ?? 'n/a'})`,
        );
        return null;
      }
      if (existing?.id) return existing.id;

      const { data, error } = await supabase
        .from('conversations')
        .insert({ business_id: businessId, customer_id: authUid })
        .select('id')
        .single();
      if (error) {
        const code = (error as any).code;
        console.error(
          '[startConversationWithBusiness] insert failed',
          {
            ...ctx,
            pgError: {
              message: error.message,
              code,
              details: (error as any).details,
              hint: (error as any).hint,
            },
          },
        );
        const isRls =
          error.message?.toLowerCase().includes('row-level security') ||
          code === '42501';
        // RLS rejection usually means the JWT for auth.uid() is stale even
        // though getSession() returned one. Treat it as a re-auth trigger.
        if (isRls) return reAuthAndRetry('rls-rejected');
        toast.error(
          `Could not start conversation: ${error.message} (code ${code ?? 'n/a'})`,
        );
        return null;
      }
      await loadConversations();
      return data.id;
    },
    [uid, login, loadConversations],
  );

  // Keep a stable ref to the latest startConversationWithBusiness so the
  // global PendingConversationDispatcher can invoke it (in retry mode)
  // without re-registering on every render.
  const startRef = useRef(startConversationWithBusiness);
  useEffect(() => {
    startRef.current = startConversationWithBusiness;
  }, [startConversationWithBusiness]);

  useEffect(() => {
    // Only register a runner when this hook instance actually has a uid;
    // the dispatcher will use it after a successful re-auth.
    if (!uid) return;
    setConversationRunner((businessId) => startRef.current(businessId, true));
    return () => {
      setConversationRunner(null);
    };
  }, [uid]);





  const sendMessage = useCallback(
    async (body: string): Promise<boolean> => {
      if (!uid || !activeConvId || !inbox) return false;
      const trimmed = body.trim();
      if (!trimmed) return false;
      const sender_role = inbox.kind === 'customer' ? 'customer' : 'business';
      if (sender_role === 'business' && !hasPaidSub) {
        toast.error('Upgrade your plan to reply to customer messages');
        return false;
      }
      const { error } = await supabase.from('messages').insert({
        conversation_id: activeConvId,
        sender_id: uid,
        sender_role,
        body: trimmed,
      });
      if (error) {
        toast.error(error.message || 'Failed to send');
        return false;
      }
      return true;
    },
    [uid, activeConvId, inbox, hasPaidSub],
  );

  const totalUnread = useMemo(
    () =>
      conversations.reduce(
        (n, c) =>
          n + (inbox?.kind === 'customer' ? c.customer_unread : c.business_unread),
        0,
      ),
    [conversations, inbox],
  );

  return {
    conversations,
    activeConvId,
    setActiveConvId,
    messages,
    loadingConvs,
    loadingMsgs,
    hasPaidSub,
    totalUnread,
    openConversation,
    startConversationWithBusiness,
    sendMessage,
    refresh: loadConversations,
  };
}
