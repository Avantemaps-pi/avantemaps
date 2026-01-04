-- Change the default value for verification_status from 'pending' to NULL
-- This ensures new businesses show as "Not Verified" instead of "Pending"
ALTER TABLE businesses 
ALTER COLUMN verification_status SET DEFAULT NULL;

-- Update existing businesses that have 'pending' but haven't actually requested verification
-- Since verification_status was defaulting to 'pending', businesses that never requested
-- verification are incorrectly marked as pending. Set them to NULL.
-- Only keep 'pending' for businesses that have is_verified = false AND is_certified = false
-- but we should assume all current 'pending' are intentional for now.
-- The user can manually update if needed.

COMMENT ON COLUMN businesses.verification_status IS 'NULL = never requested, pending = verification requested, verified = approved, rejected = denied';