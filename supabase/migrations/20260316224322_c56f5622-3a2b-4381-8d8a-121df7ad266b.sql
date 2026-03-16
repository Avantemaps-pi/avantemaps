-- Insert the DevTestUser profile without pi_uid (it's taken by another row)
INSERT INTO public.users (id, username, subscription)
VALUES (
  'c3cfe592-384f-436f-9982-5537367ddad0',
  'DevTestUser',
  'individual'
)
ON CONFLICT (id) DO NOTHING;