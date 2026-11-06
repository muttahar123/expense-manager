import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Repo root (one level up from /client) — home of the single `.env`.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig(({ mode }) => {
  // Load the SINGLE root .env so one file feeds BOTH the client and the server.
  // process.env wins so Vercel dashboard variables take effect at build time.
  const fileEnv = loadEnv(mode, rootDir, '');
  const env = { ...fileEnv, ...process.env };

  // The browser only needs the public anon key + URL. We read the same
  // (non-prefixed) names the server uses, so nothing is configured twice.
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

  return {
    plugins: [react()],
    // Expose the bridged values to client code as import.meta.env.VITE_*.
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    server: {
      port: 5173,
      proxy: {
        // Two-terminal local dev: proxy API calls to the standalone Express server.
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
