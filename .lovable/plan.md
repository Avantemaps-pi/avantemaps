# Paid Messaging & Reply Gating

Add a two-sided message gating system: businesses without a paid plan can read but not reply, and unverified users must pay a Pi fee per message to send.

## Scope (Phase 1 only)

This plan implements **Phase 1**. Phase 2 (per-business custom fee + 80/20 revenue split) is scaffolded in the schema but disabled behind a feature flag until the platform reaches 50+ active businesses.

## Behavior

### Business side (recipients)
- Already implemented: `hasPaidSub` gates the send box for `sender_role === 'business'` and DB-level RLS enforces `has_active_paid_subscription` on inserts.
- Add: unread badge and inbox list **always visible** to unpaid businesses (already true via `loadConversations` — confirm + add an "Upgrade to reply" banner in the conversation view when `!hasPaidSub`).
- Add: a small "Upgrade required to reply" CTA in `MessagesPanel` that deep-links to `/pricing`.

### Customer side (senders)
- A user is **"verified"** if their Pi account is authenticated AND they own at least one business with `is_verified = true` OR `is_certified = true`. (Reuse existing `is_verified` / `is_certified` columns on `businesses` keyed by `owner_id`.)
- Verified users → free messaging (current behavior).
- Unverified users → must pay **π 0.5 per outgoing message** via existing Pi payment flow before the message is inserted.
- Fee is configurable platform-wide via a new `platform_settings` row (`unverified_message_fee_pi`, default `0.5`).
- USD equivalent shown in UI is computed from `pi_price` table (already kept fresh by `update-pi-price`).

## Data model

New tables (migration):

```text
platform_settings
  key              text PRIMARY KEY
  value            jsonb NOT NULL
  updated_at       timestamptz default now()
  -- seeded with:
  --  unverified_message_fee_pi = 0.5
  --  custom_fee_enabled        = false   (Phase 2 flag)
  --  custom_fee_min_pi         = 0.1
  --  custom_fee_max_pi         = 5
  --  platform_revenue_share    = 0.20

message_fees
  id               uuid PK
  message_id       uuid NULL  -- set after message insert
  conversation_id  uuid NOT NULL
  sender_id        uuid NOT NULL
  business_id      int  NOT NULL
  fee_pi           numeric NOT NULL
  fee_usd          numeric NOT NULL  -- snapshot at time of payment
  payment_id       int  NOT NULL REFERENCES payments(id)
  business_share_pi numeric NOT NULL default 0   -- Phase 2
  platform_share_pi numeric NOT NULL             -- = fee_pi in Phase 1
  status           text NOT NULL  -- 'pending' | 'paid' | 'refunded'
  created_at       timestamptz default now()
```

Helper SQL functions:
- `public.is_verified_sender(uid uuid) returns boolean` — true if user owns any verified/certified business.
- `public.get_platform_setting(key text) returns jsonb`.

RLS:
- `platform_settings`: public SELECT, admin-only write.
- `message_fees`: sender can SELECT own rows; service role writes.

Update `messages` INSERT policy to additionally require: `is_verified_sender(auth.uid()) OR EXISTS (paid message_fees row for this conversation in last 60s by this sender)`. The window pattern lets the client (1) pay, (2) insert message, (3) edge function attaches `message_id` to the fee row.

## Edge functions

1. **`charge-message-fee`** (new)
   - Input: `{ conversationId, businessId }`.
   - Validates JWT, checks `is_verified_sender` — if true returns `{ skip: true }`.
   - Reads current fee from `platform_settings` + USD from `pi_price`.
   - Creates Pi payment (reuses `approve-payment` / `complete-payment` flow with `metadata.kind = 'message_fee'`).
   - On completion inserts `message_fees` row with `status='paid'`, returns `{ feeId }`.

2. **`approve-payment` / `complete-payment`** — extend to recognize `metadata.kind === 'message_fee'` and create the corresponding `message_fees` row (no subscription side-effect).

3. **`attach-message-fee`** (new, tiny) — called after the message insert with `{ feeId, messageId }`; sets `message_fees.message_id`.

## Frontend

- `src/hooks/useVerifiedSender.ts` — fetches `is_verified_sender` for current uid, cached.
- `src/hooks/useMessageFee.ts` — exposes `{ feePi, feeUsd, requiresPayment, payAndSend }`.
- `src/hooks/useMessages.ts::sendMessage` — when `sender_role === 'customer'` and `!isVerifiedSender`:
  1. Call `payAndSend()` → invokes `charge-message-fee` → opens Pi payment UI.
  2. On success, insert the message, then call `attach-message-fee`.
  3. On cancel/failure, surface toast and abort.
- `src/components/chat/ChatInput.tsx` — show inline fee notice: *"Sending costs π 0.5 (~$0.08). Verified businesses message for free."* with a "Why?" tooltip linking to a help section.
- `src/components/messages/MessagesPanel.tsx` — for unpaid businesses, show inbox + unread counts as today, but replace the input with an "Upgrade to reply" CTA card.

## Phase 2 scaffolding (disabled)

- `custom_fee_enabled` flag in `platform_settings` (default `false`).
- `businesses.custom_message_fee_pi numeric NULL` column added but unused while flag is false.
- Fee resolution helper `resolve_message_fee(business_id)` returns platform default until flag flips.
- Revenue-split math (`business_share_pi`, `platform_share_pi`) computed in `charge-message-fee` but in Phase 1 always 0 / fee.

## Files

New:
- `supabase/migrations/<ts>_message_fees.sql`
- `supabase/functions/charge-message-fee/index.ts`
- `supabase/functions/attach-message-fee/index.ts`
- `src/hooks/useVerifiedSender.ts`
- `src/hooks/useMessageFee.ts`
- `src/components/messages/UpgradeToReplyCard.tsx`
- `src/components/chat/MessageFeeNotice.tsx`

Edited:
- `supabase/functions/approve-payment/index.ts`, `complete-payment/index.ts` — handle `kind: 'message_fee'`.
- `src/hooks/useMessages.ts` — fee-aware send path.
- `src/components/chat/ChatInput.tsx` — fee notice + disabled state during payment.
- `src/components/messages/MessagesPanel.tsx` — unpaid-business CTA, keep unread badges visible.

## Out of scope

- Per-business custom fees and revenue payouts (Phase 2).
- Refund automation for failed message inserts after successful payment (manual via `message_fees.status='refunded'` for now; logged for admin review).
