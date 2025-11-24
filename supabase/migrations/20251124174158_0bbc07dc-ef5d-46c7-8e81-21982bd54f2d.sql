-- Fix search path for check_frequency_cap function
DROP FUNCTION IF EXISTS check_frequency_cap(uuid, text, text);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';