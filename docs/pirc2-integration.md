# PiRC2 Subscription Contract — Integration Plan

> **Status:** Tracking only. Feature flag `pirc2Subscriptions` is **OFF**.
> No code paths invoke a PiRC2 contract today.

## What PiRC2 is

[PiRC2](https://github.com/PiNetwork/PiRC/tree/main/PiRC2) is a **Pi Request
for Comment** — a community specification for a Soroban smart contract on
Pi Network that manages recurring subscription payments.

It is currently a **draft spec**, not a deployed contract. There is no
contract address, and no public Pi SDK method to invoke it from the browser.

The spec defines:

- **Services & Plans** — merchants register a service with one or more plans
  (price, billing period, grace period).
- **Subscriptions** — users subscribe with a pre-approved token allowance
  that the merchant pulls from each cycle.
- **Lifecycle states** — `active`, `past_due`, `paused`, `cancelled`,
  `expired`, with grace handling.
- **Charge cycles** — idempotent per-period charges identified by a cycle ID.
- **Admin methods** — pause service, refund a cycle, force-cancel.

## Why we are waiting

1. The contract is not deployed — there is nothing to call.
2. Pi Mainnet's Soroban runtime + browser-side invocation story is
   evolving; the Pi SDK does not expose contract calls today.
3. Building against a draft spec risks rework when the final ABI changes.

## When to revisit

Re-open this doc when **all** of the following are true:

- [ ] Pi Network publishes an official PiRC2 (or successor) contract address
      on Mainnet.
- [ ] The Pi SDK (or an officially supported flow) lets a Pi Browser app
      sign and submit a subscription transaction.
- [ ] We have at least one merchant use case beyond our own
      Individual / Small / Organization tiers (multi-tenant subscriptions).

## Migration plan (when we flip the flag)

This is the target shape. **Do not implement until the prerequisites above
are met.**

### 1. Database

New tables (additive — keep `subscriptions` for backfill):

- `subscription_services` — one row per merchant offering.
- `subscription_plans` — `service_id`, `price_pi`, `period_days`,
  `grace_days`, `trial_days`.
- `subscription_allowances` — `user_id`, `plan_id`, `max_amount_pi`,
  `expires_at`, `pi_authorization_ref`.
- `subscription_cycles` — `subscription_id`, `cycle_index`, `charged_at`,
  `payment_id`, `status` (`pending`/`charged`/`failed`/`refunded`),
  unique on (`subscription_id`, `cycle_index`) for idempotency.

Extend `subscriptions` with:

- `state` enum: `active | past_due | paused | cancelled | expired`
- `current_cycle_end`, `cancel_at_period_end`, `paused_until`.

### 2. Auto-renewal cron

`pg_cron` job runs hourly, picks subscriptions whose `current_cycle_end <
now()` and state in (`active`, `past_due`), then calls an edge function
`charge-subscription-cycle` which:

1. Looks up the active allowance.
2. Submits an A2U Pi payment (or, post-PiRC2, calls the contract).
3. On success → insert `subscription_cycles` row, advance `current_cycle_end`.
4. On failure → set state to `past_due`, retry within grace, then `expired`.

### 3. UI

- `/settings/subscription` — show plan, next charge date, allowance status,
  cancel/pause buttons.
- Notifications (already have the table) — 3-day pre-charge reminder,
  charge succeeded, charge failed, grace period warning.

### 4. Feature flag rollout

Flip `pirc2Subscriptions` to `true` only after staging verification with
sandbox Pi accounts.

## Other things from PiRC2 worth borrowing now

These do **not** require the contract and could be implemented independently
under separate flags / tickets:

- **Idempotent charge cycles** — even with manual renewal, a unique
  `(subscription_id, cycle_index)` constraint prevents double-charging.
- **Lifecycle states + grace period** — better UX than the current binary
  active/expired model.
- **Pre-renewal notifications** — reuse the existing notification system.

These are explicitly out of scope for this tracking doc. Open separate
tickets if you want them.

## References

- Spec: https://github.com/PiNetwork/PiRC/tree/main/PiRC2
- Feature flag: `src/config/featureFlags.ts` → `pirc2Subscriptions`
- Current subscription payment flow: `src/components/pricing/useSubscriptionPayment.ts`
