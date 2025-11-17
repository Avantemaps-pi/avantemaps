-- Security fix: Add search_path to handle_subscription_after_payment function
-- This prevents search_path injection attacks

CREATE OR REPLACE FUNCTION handle_subscription_after_payment(
  p_user_id uuid,
  p_username text,
  p_email text,
  p_subscription_tier text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_start timestamp;
  v_subscription_end timestamp;
BEGIN
  -- Set subscription dates (1 month duration)
  v_subscription_start := now();
  v_subscription_end := now() + interval '1 month';
  
  -- Insert or update user record
  INSERT INTO public.users (id, username, email, subscription, created_at)
  VALUES (p_user_id, p_username, p_email, p_subscription_tier, now())
  ON CONFLICT (id) 
  DO UPDATE SET 
    subscription = p_subscription_tier,
    username = COALESCE(EXCLUDED.username, users.username),
    email = COALESCE(EXCLUDED.email, users.email);
  
  -- End any existing active subscriptions for this user
  UPDATE public.subscriptions 
  SET end_date = now() 
  WHERE user_id = p_user_id 
    AND end_date > now();
  
  -- Create new subscription record
  INSERT INTO public.subscriptions (user_id, plan, start_date, end_date)
  VALUES (p_user_id, p_subscription_tier, v_subscription_start, v_subscription_end);
  
  RAISE LOG 'Subscription created for user % with plan % from % to %', 
    p_user_id, p_subscription_tier, v_subscription_start, v_subscription_end;
END;
$$;