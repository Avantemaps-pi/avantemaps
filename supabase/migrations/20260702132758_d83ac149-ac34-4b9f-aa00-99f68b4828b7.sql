
-- Restrict comment_votes SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view votes" ON public.comment_votes;
CREATE POLICY "Authenticated users can view votes"
ON public.comment_votes
FOR SELECT
TO authenticated
USING (true);

-- Add admin INSERT/UPDATE/DELETE policies on notification_templates
CREATE POLICY "Admins can insert templates"
ON public.notification_templates
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
ON public.notification_templates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
ON public.notification_templates
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
