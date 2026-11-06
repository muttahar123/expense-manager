-- ============================================================================
--  Personal Wealth & Expense Manager — Supabase / Postgres schema
-- ============================================================================
--  HOW TO USE:
--    1. Open your Supabase project -> SQL Editor -> New query.
--    2. Paste this entire file and click "Run".
--    3. Done. Tables, per-user Row-Level Security, and an auto-profile trigger
--       are all created. Every signed-in user only ever sees their own rows.
--
--  Safe to re-run: it drops/recreates policies and uses IF NOT EXISTS.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (preinstalled on Supabase).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
--  profiles — 1:1 with auth.users (Supabase manages the auth.users table).
--  Holds the per-user preferences the app used to keep on the Mongo "User".
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  name           text,
  email          text,
  base_currency  text    not null default 'USD',
  monthly_salary numeric not null default 0,
  salary_day     int     not null default 1 check (salary_day between 1 and 31),
  budget_rule    jsonb   not null default '{"needs":50,"wants":30,"savings":20}'::jsonb,
  financial_goals jsonb  not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
--  investments — portfolio holdings. PnL/ROI are derived in app code.
-- ---------------------------------------------------------------------------
create table if not exists public.investments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  asset_name      text not null,
  asset_type      text not null,
  invested_amount numeric not null default 0 check (invested_amount >= 0),
  current_value   numeric not null default 0 check (current_value >= 0),
  status          text not null default 'Active' check (status in ('Active','Closed')),
  quantity        numeric check (quantity is null or quantity >= 0),
  notes           text,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists investments_user_idx        on public.investments (user_id);
create index if not exists investments_user_status_idx on public.investments (user_id, status);

-- ---------------------------------------------------------------------------
--  transactions — Income / Expense / Investment entries (Omni-Input target).
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  type          text not null check (type in ('Income','Expense','Investment')),
  amount        numeric not null check (amount > 0),
  category      text not null,
  bucket        text check (bucket in ('Needs','Wants','Investments','Savings','Income')),
  date          timestamptz not null default now(),
  notes         text,
  investment_id uuid references public.investments (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, date desc);
create index if not exists transactions_user_type_idx on public.transactions (user_id, type);

-- ---------------------------------------------------------------------------
--  keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists investments_set_updated_at on public.investments;
create trigger investments_set_updated_at
  before update on public.investments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
--  Auto-create a profile row the moment a user signs up (incl. via Google).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
--  ROW-LEVEL SECURITY — this is what keeps every user's data separate.
-- ============================================================================
alter table public.profiles     enable row level security;
alter table public.investments  enable row level security;
alter table public.transactions enable row level security;

-- profiles: a user can read/update only their own profile row.
drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- investments: full CRUD, but only on rows the user owns.
drop policy if exists "investments owner all" on public.investments;
create policy "investments owner all" on public.investments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- transactions: full CRUD, but only on rows the user owns.
drop policy if exists "transactions owner all" on public.transactions;
create policy "transactions owner all" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
