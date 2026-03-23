

## Plan: Fix Pi Network Subscription Payments

### Problem Summary

Users can't upgrade their plan because of **three metadata mismatches** between the frontend payment code and the edge function validation schemas:

1. **Metadata key mismatch**: Frontend sends `{ tier, frequency, userId, timestamp }` but the edge function Zod schema expects `{ subscriptionTier, frequency }` with `.strict()` validation -- meaning extra keys like `userId` and `timestamp` cause instant rejection.

2. **Frequency value mismatch**: Frontend sends `"yearly"` but edge function validates against `z.enum(['monthly', 'annual'])` -- `"yearly"` is not `"annual"`, so validation fails.

3. **Auth result UID vs Supabase UUID**: The `userId` sent to `approvePayment` is `authResult.user.uid` (the Pi Network UID), but the edge function validates it as `z.string().uuid()` and uses it to query the `users` table by `id` (Supabase UUID). This means the payment record gets created with the wrong user ID, and the subscription update query finds no matching user.

### Changes

#### 1. Fix `src/utils/piPayment/payments.ts` (frontend payment metadata)
- Rename `tier` to `subscriptionTier` in the metadata object
- Change `frequency` value from `"yearly"` to `"annual"` when applicable
- Remove `userId` and `timestamp` from metadata (rejected by `.strict()`)
- Use the Supabase user ID (from auth context or session) instead of `authResult.user.uid` (Pi UID) for the `userId` field sent to the edge functions

#### 2. Fix `src/utils/piPayment/payments.ts` (userId resolution)
- Before calling `approvePayment` / `completePayment`, retrieve the current Supabase session to get the actual Supabase UUID
- Pass that UUID as `userId` instead of the Pi Network UID

#### 3. Fix `src/utils/piPayment/pricing.ts` (frequency mapping)
- Add a helper to normalize `"yearly"` to `"annual"` for API calls, or update the edge function schema to accept both

### Technical Details

The root cause is in `executeSubscriptionPayment()` around line 90-96:
```typescript
// CURRENT (broken)
const metadata = {
  tier,           // edge function expects "subscriptionTier"
  frequency,      // sends "yearly", edge function expects "annual"
  userId: authResult.user.uid,  // Pi UID, not Supabase UUID
  timestamp: Date.now()         // rejected by .strict()
};
```

Will be fixed to:
```typescript
// FIXED
const metadata = {
  subscriptionTier: tier,
  frequency: frequency === 'yearly' ? 'annual' : frequency,
};
```

And the `userId` passed to `approvePayment`/`completePayment` will be sourced from the Supabase session (`supabase.auth.getSession()`) rather than `authResult.user.uid`.

