-- Add tracking fields to notifications table
ALTER TABLE notifications 
ADD COLUMN delivered_at timestamp with time zone,
ADD COLUMN read_at timestamp with time zone,
ADD COLUMN clicked_at timestamp with time zone,
ADD COLUMN delivery_status text DEFAULT 'pending',
ADD COLUMN click_url text,
ADD COLUMN ab_test_id uuid,
ADD COLUMN ab_variant_id uuid;

-- Create notification A/B tests table
CREATE TABLE notification_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_id uuid REFERENCES notification_templates(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft', -- draft, running, paused, completed
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  target_sample_size integer,
  winner_variant_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create notification variants table
CREATE TABLE notification_ab_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id uuid NOT NULL REFERENCES notification_ab_tests(id) ON DELETE CASCADE,
  name text NOT NULL,
  content_template text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  traffic_percentage integer NOT NULL DEFAULT 50,
  sent_count integer DEFAULT 0,
  delivered_count integer DEFAULT 0,
  read_count integer DEFAULT 0,
  clicked_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create frequency caps table
CREATE TABLE notification_frequency_caps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  notification_type text,
  max_notifications integer NOT NULL,
  time_window_minutes integer NOT NULL,
  priority_threshold text, -- only apply to notifications below this priority
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_notifications_delivery_status ON notifications(delivery_status);
CREATE INDEX idx_notifications_delivered_at ON notifications(delivered_at);
CREATE INDEX idx_notifications_read_at ON notifications(read_at);
CREATE INDEX idx_notifications_clicked_at ON notifications(clicked_at);
CREATE INDEX idx_notifications_ab_test ON notifications(ab_test_id, ab_variant_id);
CREATE INDEX idx_ab_tests_status ON notification_ab_tests(status);
CREATE INDEX idx_ab_variants_test_id ON notification_ab_variants(ab_test_id);
CREATE INDEX idx_frequency_caps_active ON notification_frequency_caps(is_active);

-- Add RLS policies for A/B tests
ALTER TABLE notification_ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AB tests"
  ON notification_ab_tests
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active AB tests"
  ON notification_ab_tests
  FOR SELECT
  USING (status = 'running');

-- Add RLS policies for variants
ALTER TABLE notification_ab_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage variants"
  ON notification_ab_variants
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view variants of active tests"
  ON notification_ab_variants
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM notification_ab_tests
    WHERE notification_ab_tests.id = ab_test_id
    AND notification_ab_tests.status = 'running'
  ));

-- Add RLS policies for frequency caps
ALTER TABLE notification_frequency_caps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage frequency caps"
  ON notification_frequency_caps
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can read frequency caps"
  ON notification_frequency_caps
  FOR SELECT
  USING (true);

-- Add triggers for updated_at
CREATE TRIGGER update_notification_ab_tests_updated_at
  BEFORE UPDATE ON notification_ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_frequency_caps_updated_at
  BEFORE UPDATE ON notification_frequency_caps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check frequency cap
CREATE OR REPLACE FUNCTION check_frequency_cap(
  p_user_id uuid,
  p_notification_type text,
  p_priority text
) RETURNS boolean AS $$
DECLARE
  v_cap RECORD;
  v_recent_count integer;
BEGIN
  -- Get active frequency caps for this notification type
  FOR v_cap IN 
    SELECT * FROM notification_frequency_caps
    WHERE is_active = true
    AND (notification_type IS NULL OR notification_type = p_notification_type)
    AND (priority_threshold IS NULL OR 
         (p_priority = 'low' AND priority_threshold IN ('low', 'medium', 'high')) OR
         (p_priority = 'medium' AND priority_threshold IN ('medium', 'high')) OR
         (p_priority = 'high' AND priority_threshold = 'high'))
    ORDER BY max_notifications ASC
  LOOP
    -- Count recent notifications within the time window
    SELECT COUNT(*)
    INTO v_recent_count
    FROM notifications
    WHERE user_id = p_user_id
    AND created_at >= now() - (v_cap.time_window_minutes || ' minutes')::interval
    AND (v_cap.notification_type IS NULL OR type = v_cap.notification_type);
    
    -- If cap is exceeded, return false
    IF v_recent_count >= v_cap.max_notifications THEN
      RETURN false;
    END IF;
  END LOOP;
  
  -- All caps passed
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;