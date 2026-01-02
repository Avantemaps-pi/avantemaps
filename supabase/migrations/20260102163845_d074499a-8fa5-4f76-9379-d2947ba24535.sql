-- Create function to handle business verification/certification notifications
CREATE OR REPLACE FUNCTION public.notify_business_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if business was just verified
  IF (OLD.is_verified = false OR OLD.is_verified IS NULL) AND NEW.is_verified = true THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      content,
      metadata,
      priority,
      read,
      delivery_status,
      delivered_at
    ) VALUES (
      NEW.owner_id,
      'verification',
      'Congratulations! Your business "' || NEW.business_name || '" has been verified. You now have a verified badge.',
      jsonb_build_object('businessName', NEW.business_name, 'status', 'verified'),
      'high',
      false,
      'delivered',
      now()
    );
  END IF;

  -- Check if business was just certified
  IF (OLD.is_certified = false OR OLD.is_certified IS NULL) AND NEW.is_certified = true THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      content,
      metadata,
      priority,
      read,
      delivery_status,
      delivered_at
    ) VALUES (
      NEW.owner_id,
      'certification',
      'Amazing! Your business "' || NEW.business_name || '" has been certified. You now have a certified badge!',
      jsonb_build_object('businessName', NEW.business_name, 'status', 'certified'),
      'high',
      false,
      'delivered',
      now()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_business_status_notification ON public.businesses;
CREATE TRIGGER trigger_business_status_notification
  AFTER UPDATE OF is_verified, is_certified ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_business_status_change();