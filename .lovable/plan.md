
# Comprehensive Testing & Fix Plan for Avante Maps Business Management

## Overview

This plan addresses testing and fixing all business management features end-to-end, including the RLS policy issue for verification audit logging.

---

## Issues Identified

### 1. Verification Audit RLS Policy Issue (Critical)
**Problem:** The `verification_audit` table only allows admins/moderators to INSERT records, but regular users need to log verification requests from the Communicon chat interface.

**Location:** `src/hooks/useChatState.tsx` lines 107-122

**Impact:** When a user requests verification through the chat, the `logVerificationRequest` function silently fails because the user doesn't have permission to insert into `verification_audit`.

### 2. Missing Edge Functions in config.toml
**Problem:** Several edge functions exist but aren't listed in `supabase/config.toml`, which may cause issues with JWT verification settings:
- `complete-payment`
- `approve-payment`
- `cleanup-stale-payments`
- `payment-status`
- `track-notification`
- And others

### 3. Business Deletion Flow
The deletion flow is correctly implemented:
- `DeleteBusinessDialog.tsx` handles the UI
- RLS policy `Users can delete their own businesses` exists with proper `owner_id = auth.uid()` check
- The `onDeleted` callback properly updates local state

---

## Implementation Steps

### Step 1: Fix Verification Audit RLS Policy
Add a new RLS policy that allows authenticated users to log their own verification requests for businesses they own.

```sql
-- Allow users to log verification requests for their own businesses
CREATE POLICY "Users can log verification requests for their businesses"
ON public.verification_audit
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.id = verification_audit.business_id
    AND businesses.owner_id = auth.uid()
  )
  AND performed_by = auth.uid()
);
```

### Step 2: Update supabase/config.toml
Add all missing edge functions to ensure proper JWT verification settings are applied.

```toml
project_id = "xvpwbocwasbtzrzrxyvu"

[functions.chat-ai]
verify_jwt = true

[functions.verify-pi-auth]
verify_jwt = false

[functions.geocode-address]
verify_jwt = true

[functions.pinet-meta]
verify_jwt = false

[functions.list-user-businesses]
verify_jwt = true

[functions.update-pi-price]
verify_jwt = false

[functions.verify-business]
verify_jwt = false

[functions.insert-business]
verify_jwt = false

[functions.complete-payment]
verify_jwt = false

[functions.approve-payment]
verify_jwt = false

[functions.payment-status]
verify_jwt = false

[functions.cleanup-stale-payments]
verify_jwt = false

[functions.log-business-view]
verify_jwt = false

[functions.send-bulk-notification]
verify_jwt = true

[functions.process-scheduled-notifications]
verify_jwt = false

[functions.track-notification]
verify_jwt = false

[functions.create-buckets]
verify_jwt = false

[functions.supabase-set-session]
verify_jwt = false

[functions.test-env]
verify_jwt = false
```

### Step 3: Improve Error Handling in logVerificationRequest
Update the function to provide feedback when the audit log fails, rather than silently failing.

**File:** `src/hooks/useChatState.tsx`

```typescript
const logVerificationRequest = async (businessId: number, action: string) => {
  if (!user?.uid) return;

  try {
    const { error } = await supabase
      .from('verification_audit')
      .insert({
        business_id: businessId,
        performed_by: user.uid,
        action: action,
        notes: `Verification request submitted via chat interface`
      });
      
    if (error) {
      console.warn('Could not log verification request:', error.message);
      // Non-critical - don't show error to user as the verification still proceeds
    }
  } catch (error) {
    console.error('Error logging verification request:', error);
  }
};
```

---

## Testing Checklist

Once the fixes are implemented, test the following scenarios:

### Business Registration
1. Navigate to `/registration`
2. Fill out all required fields
3. Verify address geocoding works
4. Submit and confirm the business appears in `/registered-business`

### Business Update/Edit
1. From `/registered-business`, click "Edit" on a business
2. Modify some fields
3. Confirm changes are saved and reflected

### Business Deletion
1. From `/registered-business`, click the vertical ellipsis (⋮) menu
2. Select "Delete"
3. Confirm the dialog appears with business name
4. Click "Delete" and verify:
   - Toast success message appears
   - Business is removed from the list
   - Business no longer appears in database

### Verification Request (via Communicon)
1. Navigate to `/communicon`
2. Initiate a verification request
3. Select a business
4. Confirm the status updates to "pending"
5. Check that verification_audit receives a new entry (admin can verify)

---

## Technical Details

### Files to Modify:
1. **Database Migration** - Add new RLS policy for `verification_audit`
2. `supabase/config.toml` - Add missing edge function configurations
3. `src/hooks/useChatState.tsx` - Improve error handling in `logVerificationRequest`

### Files Already Correct (No Changes Needed):
- `src/components/business/DeleteBusinessDialog.tsx` - Deletion logic is correct
- `src/components/business/BusinessDropdownMenu.tsx` - Properly triggers deletion
- `src/components/business/BusinessCard.tsx` - Properly passes callbacks
- `src/pages/RegisteredBusiness.tsx` - Properly handles deletion state update

### RLS Policies Verified:
- `businesses` table: DELETE policy with `owner_id = auth.uid()` ✓
- `businesses` table: UPDATE policy with `owner_id = auth.uid()` ✓
- `businesses` table: INSERT policy with `owner_id = auth.uid()` ✓

---

## Summary

The core business deletion functionality is correctly implemented. The main fix needed is:

1. Adding an RLS policy to allow users to log their own verification requests
2. Ensuring all edge functions are properly configured in config.toml
3. Improving error handling for non-critical audit logging

After implementing these fixes, a comprehensive end-to-end test of all business management features should be performed to verify everything works as intended.
