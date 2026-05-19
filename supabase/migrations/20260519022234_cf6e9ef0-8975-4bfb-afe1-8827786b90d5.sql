
-- platform_settings
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

create policy "Anyone can read platform settings"
  on public.platform_settings for select
  using (true);

create policy "Admins can manage platform settings"
  on public.platform_settings for all
  to authenticated
  using (public.has_role((select auth.uid()), 'admin'::app_role))
  with check (public.has_role((select auth.uid()), 'admin'::app_role));

insert into public.platform_settings (key, value) values
  ('unverified_message_fee_pi', '0.5'::jsonb),
  ('custom_fee_enabled', 'false'::jsonb),
  ('custom_fee_min_pi', '0.1'::jsonb),
  ('custom_fee_max_pi', '5'::jsonb),
  ('platform_revenue_share', '0.20'::jsonb)
on conflict (key) do nothing;

-- Phase 2 scaffolding column on businesses
alter table public.businesses
  add column if not exists custom_message_fee_pi numeric;

-- message_fees
create table if not exists public.message_fees (
  id uuid primary key default gen_random_uuid(),
  message_id uuid,
  conversation_id uuid not null,
  sender_id uuid not null,
  business_id integer not null,
  fee_pi numeric not null,
  fee_usd numeric not null default 0,
  payment_id text not null,
  business_share_pi numeric not null default 0,
  platform_share_pi numeric not null,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

create index if not exists message_fees_sender_conv_idx
  on public.message_fees (sender_id, conversation_id, created_at desc);

alter table public.message_fees enable row level security;

create policy "Senders can view their own message fees"
  on public.message_fees for select
  to authenticated
  using (sender_id = (select auth.uid()));

create policy "Service role can manage message fees"
  on public.message_fees for all
  to service_role
  using (true) with check (true);

-- Helpers
create or replace function public.is_verified_sender(_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.businesses
    where owner_id = _uid
      and (is_verified = true or is_certified = true)
  );
$$;

create or replace function public.resolve_message_fee_pi(_business_id integer)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when (select (value)::text::numeric from public.platform_settings
          where key = 'custom_fee_enabled') = 1
      then coalesce(
        (select custom_message_fee_pi from public.businesses where id = _business_id),
        (select (value)::text::numeric from public.platform_settings
         where key = 'unverified_message_fee_pi')
      )
    else (select (value)::text::numeric from public.platform_settings
          where key = 'unverified_message_fee_pi')
  end;
$$;

-- Update messages insert policy to gate unverified customers behind a paid fee
drop policy if exists "Participants can send messages with gating" on public.messages;

create policy "Participants can send messages with gating"
on public.messages for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (
        (
          messages.sender_role = 'customer'
          and c.customer_id = (select auth.uid())
          and (
            public.is_verified_sender((select auth.uid()))
            or exists (
              select 1 from public.message_fees f
              where f.conversation_id = c.id
                and f.sender_id = (select auth.uid())
                and f.status = 'paid'
                and f.message_id is null
                and f.created_at > now() - interval '60 seconds'
            )
          )
        )
        or (
          messages.sender_role = 'business'
          and public.is_business_owner((select auth.uid()), c.business_id)
          and public.has_active_paid_subscription((select auth.uid()))
        )
      )
  )
);

-- After-insert trigger: attach the freshly inserted message_id to the most
-- recent unattached paid fee for this sender/conversation, so it can't be
-- reused for a second message.
create or replace function public.attach_message_fee_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sender_role = 'customer' then
    update public.message_fees f
    set message_id = new.id
    where f.id = (
      select id from public.message_fees
      where conversation_id = new.conversation_id
        and sender_id = new.sender_id
        and status = 'paid'
        and message_id is null
      order by created_at desc
      limit 1
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_attach_message_fee on public.messages;
create trigger trg_attach_message_fee
  after insert on public.messages
  for each row execute function public.attach_message_fee_after_insert();
