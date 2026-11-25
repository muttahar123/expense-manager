# Wealth & Expense Manager

A single React + Vite project using Supabase for Google authentication and data. The browser talks directly to Supabase; there is no separate Express server or `/api` proxy. Row Level Security (RLS) in Postgres restricts each query to the signed-in user's data.

## Setup

1. Install dependencies from the repository root with `npm install`.
2. Copy `.env.example` to `.env` and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from Supabase Project Settings → API Keys. A legacy `SUPABASE_ANON_KEY` also works. Never use a `sb_secret_*` or `service_role` key in the React app.
3. Run the complete `supabase/schema.sql` in the Supabase SQL Editor. Re-run the updated file after schema changes; it is safe to rerun.
4. Enable Google under Supabase Authentication → Providers and allow `http://localhost:5173` in the Auth URL configuration.
5. Start the React app with `npm run dev`.

For a production static deployment, use `npm run build` and publish `dist`. Set the same public Supabase URL and publishable key as build environment variables. No server environment variable or server deployment is needed.

The Supabase schema step is required once per Supabase project and again when the schema changes: open the project's SQL Editor, open this repo's `supabase/schema.sql`, paste the complete file, and click **Run**. The browser cannot create tables; its key is intentionally restricted by RLS. If the app reports `PGRST205` or “Could not find the table”, this step has not been completed yet.

## Loans

The loans panel records money lent and borrowed, due dates, notes, partial repayments, and payment history. Outstanding lent amounts reduce the savings balance; outstanding borrowed amounts increase it. Each repayment changes the outstanding balance and reverses that portion of the savings adjustment.

## Data security

Supabase Auth stores the user's session in the browser. All table access uses the public publishable/anon key plus that session. The `profiles`, `transactions`, `investments`, `loans`, and `loan_payments` tables have RLS policies in `supabase/schema.sql`; these policies enforce ownership in Postgres. Never add a Supabase secret/service-role key to the frontend or commit it.
