import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
const rootDir = process.cwd();

export default defineConfig(({ mode }) => {
  // Load the single root .env for local development and deployment builds.
  // process.env wins so Vercel dashboard variables take effect at build time.
  const fileEnv = loadEnv(mode, rootDir, '');
  const env = { ...fileEnv, ...process.env };

  // Only the public Supabase URL and publishable/legacy anon key reach the browser.
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const suppliedKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  // Never allow a Supabase secret/service-role credential into a browser build.
  const jwtRole = suppliedKey.startsWith('eyJ') ? (() => {
    try { return JSON.parse(Buffer.from(suppliedKey.split('.')[1], 'base64url').toString()).role; }
    catch { return ''; }
  })() : '';
  const supabaseAnonKey = suppliedKey.startsWith('sb_secret_') || jwtRole === 'service_role' ? '' : suppliedKey;
  if (suppliedKey && !supabaseAnonKey) {
    throw new Error('A Supabase secret/service-role key cannot be used by the React app. Set SUPABASE_PUBLISHABLE_KEY (or the legacy anon key).');
  }

  return {
    plugins: [react()],
    // Expose the bridged values to client code as import.meta.env.VITE_*.
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    server: { port: 5173 },
  };
});
