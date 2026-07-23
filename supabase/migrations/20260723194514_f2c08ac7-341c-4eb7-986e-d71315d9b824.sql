-- Admin write policies for notification_ab_variants
CREATE POLICY "Admins can insert ab variants"
  ON public.notification_ab_variants
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ab variants"
  ON public.notification_ab_variants
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ab variants"
  ON public.notification_ab_variants
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin write policies for notification_frequency_caps
CREATE POLICY "Admins can insert frequency caps"
  ON public.notification_frequency_caps
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update frequency caps"
  ON public.notification_frequency_caps
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete frequency caps"
  ON public.notification_frequency_caps
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));