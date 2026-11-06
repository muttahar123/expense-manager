import { createClient } from '@supabase/supabase-js';

// These are injected at build time from the single root `.env`
// (SUPABASE_URL / SUPABASE_ANON_KEY) — see client/vite.config.js.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️  Supabase keys missing. Copy .env.example -> .env at the repo root ' +
      'and fill in SUPABASE_URL + SUPABASE_ANON_KEY.'
  );
}

// A harmless placeholder keeps createClient from throwing before setup, so the
// app can still render the "finish setup" message instead of a white screen.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
