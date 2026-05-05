# Payment Tracing: `lifecycle_id` is the Single Source of Truth

## TL;DR

- **`lifecycle_id`** is the canonical end-to-end trace identifier for a payment.
- **`correlation_id` / `correlationId`** is an **alias only** — same value, different name. Kept for backward compatibility with older clients/logs.
- The database stores **only** `payments.lifecycle_id`. There is **no** `correlation_id` column, and one must not be added.

## Why one ID, two names?

Earlier iterations introduced a `correlationId` per HTTP request. We later
unified the concept into a single end-to-end identifier that spans the whole
payment lifecycle (`approve` → `complete` → `status` polling). Rather than
break existing consumers, we kept the `correlationId` name as a read-only alias
that always carries the **same value** as `lifecycleId`.

## Rules

1. **Generate once, propagate everywhere.**
   - Client generates a `lifecycleId` (e.g. `subpay_<uuid>`) at the start of a
     payment attempt via `src/utils/correlation.ts`.
   - It is sent on every request as the `x-lifecycle-id` header (and mirrored as
     `x-correlation-id` for backward compat).

2. **Persist on every payment write.**
   - `approve-payment` writes `lifecycle_id` on the initial `INSERT`.
   - `complete-payment` writes `lifecycle_id` on every `UPDATE` path
     (success, already-completed, Pi API error, exception).
   - `payment-status` writes `lifecycle_id` on the timeout/void `UPDATE`.

3. **Querying / tracing.**
   ```sql
   SELECT * FROM payments WHERE lifecycle_id = 'subpay_...';
   ```
   Indexed by `payments_lifecycle_id_idx` (partial index, `WHERE lifecycle_id IS NOT NULL`).

4. **Edge function logs.**
   - All structured logs include `lifecycleId` in the JSON payload.
   - Responses include both `lifecycleId` and `correlationId` (same value) for
     compatibility.

## Do NOT

- ❌ Do **not** add a `correlation_id` column to `payments`. It would duplicate
  data and create drift risk.
- ❌ Do **not** generate a separate `correlationId` distinct from `lifecycleId`.
  If you ever genuinely need a per-request ID distinct from the lifecycle ID,
  introduce a clearly-named new field (e.g. `request_id`) — do not repurpose
  `correlation_id`.
- ❌ Do **not** remove the `correlationId` alias from API responses without a
  deprecation cycle — external consumers may still read it.

## Where this is enforced

- DB schema: `supabase/migrations/*_add_lifecycle_id_to_payments.sql`
- Client: `src/utils/correlation.ts`, `src/api/payments/*`
- Edge functions: `supabase/functions/{approve,complete}-payment/index.ts`,
  `supabase/functions/payment-status/index.ts`
- Shared logger: `supabase/functions/_shared/logger.ts`
