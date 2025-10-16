-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update businesses table policies to protect verification fields
-- First, drop the overly permissive "Owners can manage their own businesses" policy
DROP POLICY IF EXISTS "Owners can manage their own businesses" ON businesses;

-- Create separate policies for owners and admins
CREATE POLICY "Owners can update non-verification fields"
ON businesses FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (
  auth.uid() = owner_id AND
  -- Prevent owners from changing verification fields
  is_verified = (SELECT is_verified FROM businesses b WHERE b.id = businesses.id) AND
  is_certified = (SELECT is_certified FROM businesses b WHERE b.id = businesses.id) AND
  verification_status = (SELECT verification_status FROM businesses b WHERE b.id = businesses.id)
);

CREATE POLICY "Admins can update any business"
ON businesses FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Owners can still delete their own businesses
CREATE POLICY "Owners can delete their own businesses"
ON businesses FOR DELETE
USING (auth.uid() = owner_id);

-- Owners can still insert their own businesses (with subscription limits)
-- The existing "Subscription limits business creation" policy already handles INSERT

-- Create verification audit table for tracking
CREATE TABLE public.verification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.verification_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view verification audit"
ON public.verification_audit FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can insert verification audit"
ON public.verification_audit FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Create rate limiting table for API endpoints
CREATE TABLE public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_rate_limits_lookup ON public.api_rate_limits(user_id, endpoint, created_at);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage rate limits (edge functions use service role)
CREATE POLICY "Service role can manage rate limits"
ON public.api_rate_limits FOR ALL
USING (true)
WITH CHECK (true);