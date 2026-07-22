/**
 * Global queue for conversation-creation requests that were blocked by
 * missing/expired Supabase auth. A single dispatcher (mounted once at app
 * root) listens to supabase.auth.onAuthStateChange and drains this queue
 * as soon as a valid session appears.
 */

export type ConversationRunner = (businessId: number) => Promise<string | null>;

type PendingItem = {
  businessId: number;
  resolve: (id: string | null) => void;
  enqueuedAt: number;
};

let runner: ConversationRunner | null = null;
const pending: PendingItem[] = [];
const PENDING_TTL_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Register the function used to actually attempt conversation creation.
 * Called by useMessages on mount; unset on unmount.
 */
export const setConversationRunner = (r: ConversationRunner | null) => {
  runner = r;
};

export const hasConversationRunner = () => runner !== null;

/**
 * Queue a conversation-creation request to be retried after re-auth.
 * Returns a promise that resolves with the conversation id (or null on failure/timeout).
 */
export const enqueuePendingConversation = (
  businessId: number,
): Promise<string | null> => {
  return new Promise((resolve) => {
    pending.push({ businessId, resolve, enqueuedAt: Date.now() });
  });
};

/**
 * Drain all queued requests through the registered runner. Safe to call
 * multiple times — only items present at call-time are processed.
 */
export const drainPendingConversations = async (): Promise<void> => {
  if (!runner || pending.length === 0) return;
  const now = Date.now();
  const items = pending.splice(0, pending.length);
  for (const item of items) {
    if (now - item.enqueuedAt > PENDING_TTL_MS) {
      item.resolve(null);
      continue;
    }
    try {
      const id = await runner(item.businessId);
      item.resolve(id);
    } catch (err) {
      console.error('[pendingConversationQueue] runner threw', err);
      item.resolve(null);
    }
  }
};

/**
 * Resolve queued request(s) for a specific business immediately — used when
 * re-auth finished without producing a session, so the caller gets a prompt
 * failure instead of waiting for the drain or in-flight timeout.
 */
export const resolvePendingConversation = (
  businessId: number,
  result: string | null,
): void => {
  for (let i = pending.length - 1; i >= 0; i--) {
    if (pending[i].businessId === businessId) {
      const [item] = pending.splice(i, 1);
      item.resolve(result);
    }
  }
};

/**
 * Reject all pending items — used when the user signs out before re-auth
 * completes, so callers don't hang forever.
 */
export const clearPendingConversations = (): void => {
  while (pending.length) {
    const item = pending.shift();
    item?.resolve(null);
  }
};

export const pendingConversationCount = () => pending.length;
