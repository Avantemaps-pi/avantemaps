-- Contact email confirmation that owners can't fake.
--
-- CommuniCon's "Contact information" check used to read contact_info.email_verified, which
-- owners could set themselves (RLS lets them update their own businesses row) and which stayed
-- true after the email changed. The confirmation now lives in two columns that only the
-- contact-otp edge function (service role) writes, after a correct code:
--   contact_email_verified_at  when it was confirmed
--   contact_email_verified_for the exact email confirmed, lower-cased and trimmed; verify-business
--                              only counts it while it equals the current contact_info email
--
-- No backfill: the old contact_info.email_verified flags were self-settable, so owners confirm
-- again.
--
-- contact_otps.attempts: wrong guesses per code. contact-otp allows 5, then the code is dead
-- until a new one is sent (which resets it to 0).

alter table public.businesses
  add column if not exists contact_email_verified_at timestamptz null,
  add column if not exists contact_email_verified_for text null;

alter table public.contact_otps
  add column if not exists attempts integer not null default 0;

-- RLS lets owners update (and insert) their own businesses row, so column-level protection is
-- needed: for anyone but the service role, these two columns keep their old values on update
-- and start empty on insert.
create or replace function public.protect_contact_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $f$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.contact_email_verified_at := null;
      new.contact_email_verified_for := null;
    else
      new.contact_email_verified_at := old.contact_email_verified_at;
      new.contact_email_verified_for := old.contact_email_verified_for;
    end if;
  end if;
  return new;
end
$f$;

revoke all on function public.protect_contact_email_confirmation() from public;

drop trigger if exists trg_protect_contact_email_confirmation on public.businesses;
create trigger trg_protect_contact_email_confirmation
  before insert or update on public.businesses
  for each row execute function public.protect_contact_email_confirmation();
