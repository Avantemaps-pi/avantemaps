-- Just enough of Supabase for testing a migration on plain Postgres: the API roles, auth.uid()
-- and auth.role() (as on the live project, reading the request's JWT claims), and minimal
-- businesses and contact_otps tables with the owner RLS policies.
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
grant usage on schema auth to authenticated, service_role;

create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claim.sub', true),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;

create table public.businesses (
  id serial primary key,
  owner_id uuid not null,
  business_name text not null,
  contact_info jsonb
);
alter table public.businesses enable row level security;
create policy "Owners can update their own businesses" on public.businesses for update
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners can view their own businesses" on public.businesses for select
  using (owner_id = (select auth.uid()));
create policy "Users can insert their own businesses" on public.businesses for insert
  with check (owner_id = (select auth.uid()));
grant select, insert, update on public.businesses to authenticated, service_role;
grant usage on sequence public.businesses_id_seq to authenticated, service_role;

create table public.contact_otps (
  email text primary key,
  otp text not null,
  expires_at timestamptz not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.contact_otps enable row level security;
