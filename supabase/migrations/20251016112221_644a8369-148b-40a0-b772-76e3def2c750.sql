-- Grant organization-level admin access to development UID
-- Insert/update user record with organization subscription
INSERT INTO public.users (id, username, email, subscription, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Developer', 'dev@lovable.local', 'organization', now())
ON CONFLICT (id) 
DO UPDATE SET 
  subscription = 'organization',
  username = COALESCE(EXCLUDED.username, users.username),
  email = COALESCE(EXCLUDED.email, users.email);

-- Grant admin role to development user
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (user_id, role) DO NOTHING;