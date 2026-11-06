import { createClient } from '@supabase/supabase-js';

// All credentials come from the single root `.env` (or Vercel env vars).
// See `.env.example` for how a teammate fills these in exactly once.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️  Supabase is not configured. Copy .env.example -> .env and fill in ' +
      'SUPABASE_URL + SUPABASE_ANON_KEY (see supabase/schema.sql).'
  );
}

const common = { auth: { persistSession: false, autoRefreshToken: false } };

/**
 * Admin client (service_role). Bypasses Row-Level Security — use sparingly and
 * NEVER expose to the browser. Primarily used here to verify a user's JWT.
 * Falls back to the anon key if no service role is provided (JWT verification
 * works with either).
 */
export const admin = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, common)
  : null;

/**
 * Build a request-scoped client that acts *as the signed-in user*, by passing
 * their access token through. Because every query then runs under that user's
 * identity, Postgres Row-Level Security (see supabase/schema.sql) guarantees
 * they can only ever touch their own rows — this is our per-user data isolation.
 */
export function userClient(accessToken) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    ...common,
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
