import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { isSupabaseConfigured } from '../lib/supabase.js';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.2 36.3 44 30.7 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const onClick = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle(); // redirects to Google
    } catch (e) {
      setError(e?.message || 'Could not start Google sign-in.');
      setBusy(false);
    }
  };

  return (
    <div className="app-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass-panel relative z-10 w-full max-w-sm p-6 text-center sm:p-8"
      >
        <div className="brand-mark mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl text-green-100">
          ↗
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          Wealth <span className="text-slate-500">/</span> Expense <span className="text-green-300">Manager</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in to track your income, expenses and investments — your data stays private to you.
        </p>

        {!isSupabaseConfigured ? (
          <div className="mt-6 rounded-xl border border-green-300/20 bg-green-300/[0.06] px-4 py-3 text-left text-sm text-green-100">
              <p className="font-semibold text-green-100">Setup needed</p>
              <p className="mt-1 text-slate-300">
              Add your Supabase keys to the root <code>.env</code> file (copy from{' '}
              <code>.env.example</code>) and reload.
            </p>
          </div>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onClick}
              disabled={busy}
              className="mt-7 w-full flex items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-base font-semibold text-slate-900 shadow-[0_8px_30px_rgba(255,255,255,0.08)] transition hover:bg-green-50 disabled:opacity-60"
            >
              <GoogleIcon />
              {busy ? 'Redirecting…' : 'Continue with Google'}
            </motion.button>
            {error && <p className="mt-3 text-sm text-slate-200">{error}</p>}
          </>
        )}

        <p className="mt-6 text-[10px] uppercase tracking-[0.16em] text-slate-500">Secured by Supabase Auth</p>
      </motion.div>
    </div>
  );
}
