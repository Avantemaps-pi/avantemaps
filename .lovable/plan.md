

# Streamline Business Verification to Complete Instantly

## Problem
Currently, the `verify-business` edge function calls an **external** verification API (`ulsrprpsgiatqmakluby.supabase.co`), which adds latency and external dependency. The user confirms the verifier is actually within the same Supabase project, so the verification can be done directly in the edge function itself.

## Solution
Simplify the `verify-business` edge function to perform verification **locally** -- validate the business ownership, update the `businesses` table directly, and return a success response. No external API call needed. This will complete in under a second.

## Changes

### 1. Update `supabase/functions/verify-business/index.ts`
- Remove the external API calls to `ulsrprpsgiatqmakluby.supabase.co`
- Remove the `VERIFICATION_API_KEY` dependency
- After validating ownership, directly update the business record:
  - Set `verification_status` to `'verified'` (or `'certified'`)
  - Set `is_verified` (or `is_certified`) to `true`
- Return success immediately

### 2. Update `src/hooks/useChatState.tsx`
- Update the success message to reflect instant verification (remove "2-3 business days" language)
- After successful verification, show a confirmation like: "Your business has been verified successfully!"
- Remove the fallback that sets status to `'pending'` on error -- since verification is now local, it either succeeds or fails

### 3. No changes needed to `supabase/config.toml`
- The existing configuration for `verify-business` (verify_jwt = false) is already correct since the function handles auth internally.

## Technical Details

The simplified edge function flow:
1. Validate auth token
2. Parse request body (business_id, verification_type)
3. Verify the user owns the business (query `businesses` table)
4. Update the business record directly (`is_verified = true`, `verification_status = 'verified'`)
5. Return success response

This eliminates the external HTTP call entirely, making verification near-instant.

