-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create notification templates table for admins
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  type text NOT NULL,
  content_template text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_active boolean NOT NULL DEFAULT true,
  variables jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage templates"
ON public.notification_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view active templates
CREATE POLICY "Anyone can view active templates"
ON public.notification_templates
FOR SELECT
USING (is_active = true);

-- Create index for performance
CREATE INDEX idx_notification_templates_type ON public.notification_templates(type);
CREATE INDEX idx_notification_templates_active ON public.notification_templates(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default templates
INSERT INTO public.notification_templates (name, type, content_template, description, priority, variables) VALUES
('business_approved', 'business', 'Your business "{{businessName}}" has been listed successfully', 'Notification sent when a business is approved', 'medium', '["businessName"]'::jsonb),
('verification_approved', 'verification', 'Congratulations! "{{businessName}}" has been verified ✓', 'Notification sent when verification is approved', 'high', '["businessName"]'::jsonb),
('new_review', 'review', '{{userName}} left a {{rating}}-star review on "{{businessName}}"', 'Notification sent when a user receives a new review', 'medium', '["userName", "businessName", "rating"]'::jsonb),
('payment_success', 'payment', 'Payment of {{amount}} Pi received for {{tier}} subscription', 'Notification sent when payment is successful', 'high', '["amount", "tier"]'::jsonb),
('new_follower', 'follower', '{{userName}} started following your business "{{businessName}}"', 'Notification sent when someone follows a business', 'low', '["userName", "businessName"]'::jsonb);