-- Make messaging fully free for everyone: remove the message-fee gate on
-- unverified customers and the paid-subscription gate on business replies.
-- Product decision: businesses will choose paid-tier perks separately later;
-- for now, messaging itself has zero restrictions beyond normal conversation
-- ownership (customer on their own conversation, business owner on their
-- own business's conversation).
--
-- Deliberately NOT dropped by this migration (still referenced elsewhere or
-- kept for potential future reuse, per product instruction):
--   - public.resolve_message_fee_pi(_business_id)
--   - public.message_fees table
--   - public.attach_message_fee_after_insert() / trg_attach_message_fee
--     (fires after every message insert; no-ops when there's no unattached
--     paid fee row to link, which will now always be the case for new sends)
--
-- public.has_active_paid_subscription(_user_id) and public.is_verified_sender(_uid)
-- lose their only caller (this policy) and, after the matching client-side
-- cleanup, their only other caller (src/hooks/useVerifiedSender.ts). They are
-- left in place rather than dropped, since dropping functions wasn't part of
-- this request — safe to remove in a follow-up if desired.

DROP POLICY IF EXISTS "Participants can send messages with gating" ON public.messages;

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (
        (messages.sender_role = 'customer' and c.customer_id = (select auth.uid()))
        or
        (messages.sender_role = 'business' and public.is_business_owner((select auth.uid()), c.business_id))
      )
  )
);
