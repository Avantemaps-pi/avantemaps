-- Create scheduled_notifications table
CREATE TABLE IF NOT EXISTS public.scheduled_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid REFERENCES public.notification_templates(id) ON DELETE CASCADE,
  scheduled_for timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  target_criteria jsonb DEFAULT '{}'::jsonb,
  target_user_ids uuid[],
  metadata jsonb DEFAULT '{}'::jsonb,
  error_message text,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone,
  cancelled_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can manage scheduled notifications
CREATE POLICY "Admins can manage scheduled notifications"
ON public.scheduled_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_scheduled_notifications_status ON public.scheduled_notifications(status);
CREATE INDEX idx_scheduled_notifications_scheduled_for ON public.scheduled_notifications(scheduled_for);
CREATE INDEX idx_scheduled_notifications_template ON public.scheduled_notifications(template_id);

-- Create trigger for automatic cancellation tracking
CREATE OR REPLACE FUNCTION update_cancelled_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    NEW.cancelled_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_scheduled_notifications_cancelled_at
BEFORE UPDATE ON public.scheduled_notifications
FOR EACH ROW
EXECUTE FUNCTION update_cancelled_at();

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;