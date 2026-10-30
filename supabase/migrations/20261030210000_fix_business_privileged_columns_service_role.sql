-- protect_business_privileged_columns let the service role through by reading the legacy
-- request.jwt.claim.role setting, which current PostgREST no longer sets (it only sets
-- request.jwt.claims). So edge functions using the service role (verify-business) were treated
-- like ordinary users and their changes to is_verified / is_certified / verification_status /
-- is_active were silently reverted: no business could ever become Verified or Certified.
-- auth.role() reads request.jwt.claims (and the legacy setting if present), the same check used
-- by has_role and protect_contact_email_confirmation. Nothing else in the function changes.
create or replace function public.protect_business_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  is_privileged boolean := false;
begin
  -- Service role (edge functions) bypasses
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if auth.uid() is not null and public.has_role(auth.uid(), 'admin'::app_role) then
    is_privileged := true;
  end if;

  if is_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_verified := false;
    new.is_certified := false;
    new.verification_status := null;
    new.is_active := coalesce(new.is_active, true);
    return new;
  end if;

  -- UPDATE: preserve prior values on protected columns
  new.is_verified := old.is_verified;
  new.is_certified := old.is_certified;
  new.verification_status := old.verification_status;
  new.is_active := old.is_active;
  return new;
end;
$function$;
