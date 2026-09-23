-- Milestone Tracking — Supabase schema.
-- Run once in a fresh project: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: every object is created with IF NOT EXISTS / OR REPLACE.
--
-- Accounts:
--   * Sign-up goes through the app's /api/auth/signup route (service role), which
--     creates the auth user and lets the trigger below create the profile.
--   * Every new profile starts as status = 'draft', role = 'learner'.
--   * An admin approves an account by editing public.profiles in the Table Editor:
--     status 'draft' → 'active'. Only active accounts can sign in and sync progress.
--   * Learners can never change their own status or role (no UPDATE grant on those
--     columns, and RLS only lets staff update other rows).

-- ------------------------------------------------------------------ enums

do $$ begin
  create type public.account_status as enum ('draft', 'active', 'disabled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_role as enum ('admin', 'teacher', 'learner');
exception when duplicate_object then null; end $$;

-- ------------------------------------------------------------------ profiles

create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text not null check (char_length(full_name) between 1 and 100),
  phone                 text not null unique check (phone ~ '^[0-9]{9,15}$'),
  status                public.account_status not null default 'draft',
  role                  public.account_role   not null default 'learner',
  lang                  text not null default 'vi' check (lang in ('vi', 'en')),
  telegram_chat_id      bigint unique,
  telegram_link_code    text unique,
  telegram_link_expires timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  approved_at           timestamptz
);

comment on column public.profiles.status is 'draft = waiting for approval, active = can sign in, disabled = blocked';
comment on column public.profiles.phone  is 'Digits only, country code included (e.g. 84901234567)';

create index if not exists profiles_status_idx on public.profiles (status);

-- Keep updated_at / approved_at honest whoever edits the row (app or Table Editor).
create or replace function public.touch_profile()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();

  if new.status = 'active' and (old.status is distinct from 'active') then
    new.approved_at := now();
  end if;

  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_profile();

-- Create the profile from the metadata passed at sign-up. Status and role are
-- never read from metadata — a caller cannot sign themselves up as an admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, lang)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Learner'),
    new.raw_user_meta_data ->> 'phone',
    case when new.raw_user_meta_data ->> 'lang' = 'en' then 'en' else 'vi' end
  );

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ helpers
-- SECURITY DEFINER so policies can consult profiles without recursing into
-- the profiles policies themselves.

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active' and role in ('admin', 'teacher')
  );
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and status = 'active' and role = 'admin'
  );
$$;

-- ------------------------------------------------------------------ user_progress
-- One row per learner: the same ProgressData blob the browser keeps in
-- localStorage["progress:v1"]. The app merges it entry by entry, so the row is
-- a union of every device the learner has used.

create table if not exists public.user_progress (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ RLS

alter table public.profiles      enable row level security;
alter table public.user_progress enable row level security;

drop policy if exists "read own profile"    on public.profiles;
drop policy if exists "staff read profiles" on public.profiles;
drop policy if exists "admin update profiles" on public.profiles;

create policy "read own profile"      on public.profiles for select using (id = auth.uid());
create policy "staff read profiles"   on public.profiles for select using (public.is_staff());
create policy "admin update profiles" on public.profiles for update using (public.is_admin());

-- Signed-in users may not touch profile columns directly at all; admins go
-- through RLS above, everyone else through the service-role API routes.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant  update (full_name, status, role) on public.profiles to authenticated;

drop policy if exists "own progress"        on public.user_progress;
drop policy if exists "staff read progress" on public.user_progress;

-- Only an approved account can read or write its progress. A draft account
-- that somehow holds a session gets nothing.
create policy "own progress" on public.user_progress
  for all
  using (user_id = auth.uid() and public.is_active_user())
  with check (user_id = auth.uid() and public.is_active_user());

create policy "staff read progress" on public.user_progress
  for select using (public.is_staff());

revoke all on public.user_progress from anon;
