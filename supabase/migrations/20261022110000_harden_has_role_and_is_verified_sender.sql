-- has_role is used in many RLS policies and security-definer functions, always as has_role(auth.uid(), ...).
-- Restrict it to answering about the caller (or the service role) so it can't be used to look up other users' roles.
-- coalesce(..., false): never return NULL, so "IF NOT has_role(...)" checks still refuse signed-out callers.
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $f$
  select coalesce(
    (_user_id = auth.uid() or auth.role() = 'service_role')
      and exists (select 1 from public.user_roles where user_id = _user_id and role = _role),
    false)
$f$;

-- is_verified_sender is not used by any policy, function, app code or edge function.
-- It answered for any user id, so close it to API callers (service_role keeps access).
revoke execute on function public.is_verified_sender(uuid) from public, anon, authenticated;
