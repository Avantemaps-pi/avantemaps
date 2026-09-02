import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth';
import { toast } from 'sonner';
import {
  enqueuePendingConversation,
  resolvePendingConversation,
  setConversationRunner,
} from '@/lib/pendingConversationQueue';
import { recordReauthEvent, type ReauthEventType } from '@/utils/telemetry/reauthTelemetry';

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

export function useMessages(inbox: Inbox | null) {
  const { user, login, refreshUserData } = useAuth();
  const uid = user?.uid;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const channelRef = useRef<any>(null);
  // Deduplicate in-flight startConversationWithBusiness calls per businessId.
  // Recently-resolved promises are also kept for a short TTL so rapid repeat
  // clicks reuse the prior result instead of issuing a new request.
  const inFlightRef = useRef<Map<number, Promise<string | null>>>(new Map());
  const dedupeTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const mountedRef = useRef(true);
  // Time window (ms) during which a completed call is reused for the same businessId.
  const DEDUPE_TTL_MS = 4000;
  // Hard timeout (ms) after which a hung in-flight call resolves to null.
  const INFLIGHT_TIMEOUT_MS = 15000;

  // Clear in-flight deduplication on unmount to avoid memory leaks
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      inFlightRef.current.clear();
      dedupeTimersRef.current.forEach((t) => clearTimeout(t));
      dedupeTimersRef.current.clear();
    };
  }, []);

  const loadConversations = useCallback(async () => {
    if (!inbox) return;

    let customerId: string | null = null;
    if (inbox.kind === 'customer') {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUid = sessionData?.session?.user?.id ?? null;
      if (authUid) {
        customerId = authUid;
        if (uid && authUid !== uid) {
          // Stale local uid: proceed with the live session id, but resync
          // the cached user in the background so subsequent renders are
          // consistent.
          console.warn(
            '[loadConversations] local uid stale vs Supabase session — proceeding with authUid',
            { localUid: uid, authUid },
          );
          recordReauthEvent('uid_stale_non_blocking' as ReauthEventType, {
            localUid: uid,
            authUid,
            retryReason: 'uid-stale-non-blocking',
            isRetry: false,
            message: 'local uid stale in loadConversations; proceeding with authUid from live session',
          });
          try {
            void Promise.resolve(refreshUserData?.(true)).catch(() => {
              /* silent — non-blocking best effort */
            });
          } catch {
            /* silent */
          }
        }
      } else if (uid) {
        customerId = uid;
      }
      if (!customerId) return;
    }

    setLoadingConvs(true);
    let query = supabase
      .from('conversations')
      .select(
        'id, business_id, customer_id, last_message_at, last_message_preview, customer_unread, business_unread, created_at, businesses:business_id(business_name,images)'
      )
      .order('last_message_at', { ascending: false });

    if (inbox.kind === 'customer') {
      if (!customerId) { setLoadingConvs(false); return; }
      query = query.eq('customer_id', customerId);
    } else {
      query = query.eq('business_id', inbox.businessId);
    }

    const { data, error } = await query;
    if (error) {
      console.error(error);
      toast.error('Failed to load conversations', { id: 'msg:load-convs-failed', duration: 4000 });
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
  }, [uid, inbox, refreshUserData]);

  // Keep the latest loadConversations in a ref so effects can call it without
  // depending on its (frequently changing) identity. A background uid resync
  // rebuilds the callback; without this indirection every resync retriggered a
  // full refetch and made the conversation skeleton flicker.
  const loadConversationsRef = useRef(loadConversations);
  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  // Stable "should we refetch" signal: only the inbox identity matters.
  const inboxKey = inbox
    ? inbox.kind === 'customer'
      ? 'customer'
      : `business:${inbox.businessId}`
    : null;

  useEffect(() => {
    if (!inboxKey) return;
    loadConversationsRef.current();
  }, [inboxKey]);

  // Realtime: refresh on new messages affecting any of our conversations
  useEffect(() => {
    if (!uid || !inboxKey) return;
    const channel = supabase
      .channel(`messages-${inboxKey === 'customer' ? `c-${uid}` : `b-${inboxKey}`}`)
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
          loadConversationsRef.current();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => loadConversationsRef.current(),
      )
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, inboxKey, activeConvId]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, sender_role, body, read_at, created_at')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (error) {
      toast.error('Failed to load messages', { id: 'msg:load-msgs-failed', duration: 4000 });
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
      // Deduplicate: if a call for this businessId is already in flight, return its promise.
      const inFlight = inFlightRef.current;
      if (!isRetry && inFlight.has(businessId)) {
        return inFlight.get(businessId)!;
      }

      const run = async (): Promise<string | null> => {
        const ctxBase = { businessId, localUid: uid ?? null, isRetry };
        if (!uid) {
          console.warn('[startConversationWithBusiness] no local uid', ctxBase);
          toast.error('Please sign in first', { id: 'msg:auth-required', duration: 4000 });
          return null;
        }

        // Helper: trigger re-auth and hand the request to the global
        // PendingConversationDispatcher, which will retry it as soon as
        // onAuthStateChange reports a fresh session.
        const reAuthAndRetry = async (
          reason: string,
          authUid: string | null = null,
        ): Promise<string | null> => {
          const telemetryCtx = {
            businessId,
            localUid: uid ?? null,
            authUid,
            retryReason: reason,
            isRetry,
          };
          if (isRetry) {
            console.error(
              '[startConversationWithBusiness] retry after re-auth still failing',
              { ...ctxBase, reason },
            );
            recordReauthEvent('reauth_retry_exhausted', {
              ...telemetryCtx,
              message: 'retry after re-auth still failing',
            });
            toast.error('Still signed out after re-auth. Please try again.', { id: 'msg:re-auth-failed', duration: 4000 });
            return null;
          }
          recordReauthEvent('reauth_triggered', telemetryCtx);
          const toastId = toast.loading('Signing you back in…');
          // Queue the request *before* kicking off login so the dispatcher
          // picks it up the moment SIGNED_IN / TOKEN_REFRESHED fires.
          const pending = enqueuePendingConversation(businessId);
          login()
            .then(async () => {
              // login() resolves even when auth genuinely failed (it handles
              // its own errors internally), so confirm a real session exists
              // before declaring success.
              const { data: postLogin } = await supabase.auth.getSession();
              if (postLogin?.session?.user?.id) {
                toast.success('Signed back in — resuming…', { id: toastId, duration: 4000 });
                return;
              }
              console.error(
                '[startConversationWithBusiness] re-auth completed without a session',
                { ...ctxBase, reason },
              );
              recordReauthEvent('reauth_failed', {
                ...telemetryCtx,
                message: 'login() resolved but no session was established',
              });
              toast.error('Sign-in failed. Please try again.', { id: toastId, duration: 4000 });
              // Resolve the queued request now so the caller gets a prompt
              // failure instead of hanging until the in-flight timeout.
              resolvePendingConversation(businessId, null);
            })
            .catch((err) => {
              console.error('[startConversationWithBusiness] re-auth failed', {
                ...ctxBase,
                reason,
                err,
              });
              recordReauthEvent(
                'reauth_failed',
                { ...telemetryCtx, message: 'login() rejected' },
                err,
              );
              toast.error('Sign-in failed. Please try again.', { id: toastId, duration: 4000 });
              resolvePendingConversation(businessId, null);
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
          return reAuthAndRetry('missing-session', authUid);
        }
        if (authUid !== uid) {
          // Non-blocking: RLS + the queries below rely solely on `authUid`
          // (from the live Supabase session), so a stale local `user.uid`
          // in React state does not compromise correctness. This mismatch
          // is a known structural race between setSession() (fires SIGNED_IN
          // immediately) and updateUserData() (which corrects `user.uid`
          // after an intentional 150ms delay + RPC round-trip). Log for
          // observability but proceed — do NOT trigger reAuthAndRetry, which
          // was causing an infinite re-auth loop for accounts whose cached
          // PiUser.uid was stale.
          console.warn(
            '[startConversationWithBusiness] local uid stale vs Supabase session — proceeding with authUid',
            ctx,
          );
          recordReauthEvent('uid_stale_non_blocking' as ReauthEventType, {
            businessId,
            localUid: uid ?? null,
            authUid,
            retryReason: 'uid-stale-non-blocking',
            isRetry,
            message: 'local uid stale; proceeding with authUid from live session',
          });
          // Fire-and-forget local cache resync so subsequent actions see the
          // corrected uid. Never block the current operation on this.
          try {
            void Promise.resolve(refreshUserData?.(true)).catch(() => {
              /* silent — non-blocking best effort */
            });
          } catch {
            /* silent */
          }
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
            { id: 'msg:conv-lookup-failed', duration: 4000 },
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
          if (isRls) return reAuthAndRetry('rls-rejected', authUid);
          toast.error(
            `Could not start conversation: ${error.message} (code ${code ?? 'n/a'})`,
            { id: 'msg:start-conv-failed', duration: 4000 },
          );
          return null;
        }
        if (mountedRef.current) await loadConversations();
        return data.id;
      };

      const promise = Promise.race<string | null>([
        run(),
        new Promise<string | null>((resolve) => {
          setTimeout(() => {
            console.warn(
              '[startConversationWithBusiness] in-flight timeout exceeded',
              { businessId, timeoutMs: INFLIGHT_TIMEOUT_MS },
            );
            resolve(null);
          }, INFLIGHT_TIMEOUT_MS);
        }),
      ]);
      if (!isRetry) {
        inFlight.set(businessId, promise);
        const scheduleEviction = () => {
          const timers = dedupeTimersRef.current;
          const prev = timers.get(businessId);
          if (prev) clearTimeout(prev);
          const handle = setTimeout(() => {
            inFlight.delete(businessId);
            timers.delete(businessId);
          }, DEDUPE_TTL_MS);
          timers.set(businessId, handle);
        };
        promise.then(scheduleEviction, scheduleEviction);
      }
      return promise;
    },
    [uid, login, loadConversations, refreshUserData],
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

      // Optimistic append: show the message immediately, roll back on error.
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticMsg: MessageRow = {
        id: tempId,
        conversation_id: activeConvId,
        sender_id: uid,
        sender_role,
        body: trimmed,
        read_at: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConvId,
          sender_id: uid,
          sender_role,
          body: trimmed,
        })
        .select('id, created_at')
        .single();
      if (error || !inserted) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast.error(error?.message || 'Failed to send', { id: 'msg:send-failed', duration: 4000 });
        return false;
      }

      // Replace the optimistic placeholder with the server-confirmed row so
      // subsequent realtime INSERT events don't produce a duplicate.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, id: inserted.id, created_at: inserted.created_at ?? m.created_at }
            : m,
        ),
      );

      return true;
    },
    [uid, activeConvId, inbox],
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
    totalUnread,
    openConversation,
    startConversationWithBusiness,
    sendMessage,
    refresh: loadConversations,
  };
}
