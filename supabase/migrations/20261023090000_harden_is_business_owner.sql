-- is_business_owner is used in conversation, message and message-fee RLS policies, always as
-- is_business_owner(auth.uid(), business_id). Restrict it to answering about the caller (or the
-- service role) so it can't be used to find out who owns a business from someone's user id.
-- coalesce(..., false): never return NULL.
create or replace function public.is_business_owner(_user_id uuid, _business_id integer)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $f$
  select coalesce(
    (_user_id = auth.uid() or auth.role() = 'service_role')
      and exists (select 1 from public.businesses where id = _business_id and owner_id = _user_id),
    false)
$f$;
