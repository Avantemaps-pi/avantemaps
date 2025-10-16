-- Grant admin access to specified users
INSERT INTO public.user_roles (user_id, role, created_by)
VALUES 
  ('172aaf05-9f73-4f99-a26c-07c165952cb0', 'admin', '172aaf05-9f73-4f99-a26c-07c165952cb0'),
  ('93b49163-f892-4741-93b0-06fb4387cdbf', 'admin', '93b49163-f892-4741-93b0-06fb4387cdbf')
ON CONFLICT (user_id, role) DO NOTHING;