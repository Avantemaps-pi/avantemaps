-- Add is_active column to businesses if it does not exist
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Function to handle subscription downgrades by deactivating excess businesses
CREATE OR REPLACE FUNCTION public.handle_subscription_downgrade()
RETURNS TRIGGER AS $$
DECLARE
  old_limit INTEGER;
  new_limit INTEGER;
BEGIN
  -- Only act if the subscription tier actually changed
  IF NEW.subscription IS DISTINCT FROM OLD.subscription THEN
    old_limit := CASE OLD.subscription
                   WHEN 'organization' THEN 5
                   WHEN 'small-business' THEN 3
                   ELSE 1
                 END;
    new_limit := CASE NEW.subscription
                   WHEN 'organization' THEN 5
                   WHEN 'small-business' THEN 3
                   ELSE 1
                 END;

    -- Only act on downgrades
    IF new_limit < old_limit THEN
      -- Reactivate all first so we work from a clean slate
      UPDATE public.businesses
      SET is_active = true
      WHERE owner_id = NEW.id;

      -- Deactivate any beyond the new limit, keeping the most recent ones active
      UPDATE public.businesses
      SET is_active = false
      WHERE id IN (
        SELECT id FROM public.businesses
        WHERE owner_id = NEW.id
        ORDER BY created_at DESC
        OFFSET new_limit
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS handle_subscription_downgrade_trigger ON public.users;

CREATE TRIGGER handle_subscription_downgrade_trigger
  AFTER UPDATE OF subscription ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_downgrade();