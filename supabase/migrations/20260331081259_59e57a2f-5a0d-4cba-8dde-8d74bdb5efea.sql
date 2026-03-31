-- Update DevTestUser to small-business so analytics page is accessible
UPDATE public.users SET subscription = 'small-business' WHERE id = 'c3cfe592-384f-436f-9982-5537367ddad0';