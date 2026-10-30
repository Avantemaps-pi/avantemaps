-- Test for supabase/migrations/20261030120000_contact_email_confirmation.sql.
-- Run on a throwaway database after tests/db/supabase-stubs.sql and the migration (see
-- tests/db/run-contact-email-confirmation.sh). Any failed check raises an exception.
\set ON_ERROR_STOP on

insert into public.businesses (id, owner_id, business_name, contact_info)
values (1, '00000000-0000-0000-0000-0000000000a1', 'Harbour Light Coffee', '{"email":"Hello@Harbour.example"}');
select setval('public.businesses_id_seq', 1) \g /dev/null

-- As the authenticated owner: updates to the confirmation columns are ignored, other columns work
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
update public.businesses
  set contact_email_verified_for = 'x', contact_email_verified_at = now(), business_name = 'Harbour Light'
  where id = 1;
do $$
declare b record;
begin
  select * into b from public.businesses where id = 1;
  if b.contact_email_verified_for is not null or b.contact_email_verified_at is not null then
    raise exception 'owner set the confirmation columns: % %', b.contact_email_verified_for, b.contact_email_verified_at;
  end if;
  if b.business_name <> 'Harbour Light' then
    raise exception 'owner update of other columns was blocked';
  end if;
end $$;

-- An owner's insert can't arrive pre-confirmed either
insert into public.businesses (owner_id, business_name, contact_info, contact_email_verified_for, contact_email_verified_at)
values ('00000000-0000-0000-0000-0000000000a1', 'Second Shop', '{"email":"a@b.example"}', 'a@b.example', now());
do $$
begin
  if exists (select 1 from public.businesses where business_name = 'Second Shop' and
             (contact_email_verified_for is not null or contact_email_verified_at is not null)) then
    raise exception 'owner inserted a confirmed business';
  end if;
end $$;
commit;

-- As the service role: it can set them
begin;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.businesses
  set contact_email_verified_for = 'hello@harbour.example', contact_email_verified_at = now()
  where id = 1;
commit;
do $$
begin
  if (select contact_email_verified_for from public.businesses where id = 1) is distinct from 'hello@harbour.example' then
    raise exception 'service role could not set the confirmation';
  end if;
end $$;

-- And the owner can't clear or change an existing confirmation
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
update public.businesses set contact_email_verified_for = 'attacker@evil.example' where id = 1;
commit;
do $$
begin
  if (select contact_email_verified_for from public.businesses where id = 1) is distinct from 'hello@harbour.example' then
    raise exception 'owner changed an existing confirmation';
  end if;
end $$;

-- contact_otps.attempts exists with default 0
insert into public.contact_otps (email, otp, expires_at) values ('a@b.example', '123456', now() + interval '10 minutes');
do $$
begin
  if (select attempts from public.contact_otps where email = 'a@b.example') <> 0 then
    raise exception 'attempts default is not 0';
  end if;
end $$;

select 'contact email confirmation migration: all checks passed' as result;
