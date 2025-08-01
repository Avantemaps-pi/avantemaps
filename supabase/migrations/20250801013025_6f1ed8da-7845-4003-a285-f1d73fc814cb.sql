-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own data
CREATE POLICY "Users can view their own data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Create policy for users to update their own data
CREATE POLICY "Users can update their own data" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Create policy for users to insert their own data
CREATE POLICY "Users can insert their own data" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own subscriptions
CREATE POLICY "Users can update their own subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to handle subscription creation/update after payment completion
CREATE OR REPLACE FUNCTION handle_subscription_after_payment(
  p_user_id uuid,
  p_username text,
  p_email text,
  p_subscription_tier text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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