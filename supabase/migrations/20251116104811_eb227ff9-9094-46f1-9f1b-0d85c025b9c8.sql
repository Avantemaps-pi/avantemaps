-- Create table to store Pi cryptocurrency price
CREATE TABLE IF NOT EXISTS public.pi_price (
  id SERIAL PRIMARY KEY,
  price_usd DECIMAL(10, 4) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.pi_price ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the Pi price
CREATE POLICY "Allow public read access to pi_price"
ON public.pi_price
FOR SELECT
TO public
USING (true);

-- Insert initial price
INSERT INTO public.pi_price (price_usd) VALUES (0.65);

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;