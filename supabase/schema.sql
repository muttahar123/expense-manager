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
  realized_value  numeric not null default 0 check (realized_value >= 0),
  status          text not null default 'Active' check (status in ('Active','Closed')),
  quantity        numeric check (quantity is null or quantity >= 0),
  notes           text,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Add this field to databases created with an earlier version of the schema.
alter table public.investments add column if not exists realized_value numeric not null default 0 check (realized_value >= 0);

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
--  loans — money lent to or borrowed from another person.
--  Outstanding balances are reflected directly in the user's savings balance.
-- ---------------------------------------------------------------------------
create table if not exists public.loans (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  direction          text not null check (direction in ('Lent', 'Borrowed')),
  person_name        text not null,
  principal_amount   numeric not null check (principal_amount > 0),
  outstanding_amount numeric not null check (outstanding_amount >= 0 and outstanding_amount <= principal_amount),
  due_date           date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists loans_user_created_idx on public.loans (user_id, created_at desc);

create table if not exists public.loan_payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  loan_id      uuid not null references public.loans (id) on delete cascade,
  amount       numeric not null check (amount > 0),
  payment_date date not null default current_date,
  notes        text,
  created_at   timestamptz not null default now()
);

create index if not exists loan_payments_user_loan_idx on public.loan_payments (user_id, loan_id, payment_date desc);

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

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at
  before update on public.loans
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
alter table public.loans        enable row level security;
alter table public.loan_payments enable row level security;

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

drop policy if exists "loans owner all" on public.loans;
create policy "loans owner all" on public.loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "loan payments owner all" on public.loan_payments;
create policy "loan payments owner all" on public.loan_payments
  for all using (
    auth.uid() = user_id
    and exists (select 1 from public.loans where loans.id = loan_id and loans.user_id = auth.uid())
  ) with check (
    auth.uid() = user_id
    and exists (select 1 from public.loans where loans.id = loan_id and loans.user_id = auth.uid())
  );

-- The repayment is recorded and the outstanding balance adjusted atomically.
create or replace function public.record_loan_payment(
  p_loan_id uuid,
  p_amount numeric,
  p_payment_date date default current_date,
  p_notes text default null
)
returns public.loans
language plpgsql
security definer
set search_path = public
as $$
declare
  current_loan public.loans%rowtype;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to record a repayment.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Repayment amount must be greater than zero.';
  end if;

  select * into current_loan
  from public.loans
  where id = p_loan_id and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Loan not found or not accessible.';
  end if;
  if p_amount > current_loan.outstanding_amount then
    raise exception 'Repayment cannot exceed the outstanding balance.';
  end if;

  insert into public.loan_payments (user_id, loan_id, amount, payment_date, notes)
  values (auth.uid(), current_loan.id, p_amount, coalesce(p_payment_date, current_date), nullif(trim(p_notes), ''));

  update public.loans
  set outstanding_amount = current_loan.outstanding_amount - p_amount
  where id = current_loan.id
  returning * into current_loan;

  return current_loan;
end;
$$;

revoke all on function public.record_loan_payment(uuid, numeric, date, text) from public;
grant execute on function public.record_loan_payment(uuid, numeric, date, text) to authenticated;

grant select, insert on public.loans to authenticated;
grant select on public.loan_payments to authenticated;

-- Make the new tables visible to the Supabase REST API immediately.
notify pgrst, 'reload schema';
