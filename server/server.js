// Local/standalone entry point for the Express API (two-terminal dev).
// On Vercel this file is not used — `api/index.js` imports the same app.
// Env is read from the single root `.env` (see .env.example).
import 'dotenv/config';
import app from './src/app.js';
import { isConfigured } from './src/config/supabase.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Wealth Manager API running on http://localhost:${PORT}`);
  if (!isConfigured) {
    // eslint-disable-next-line no-console
    console.log('   (Supabase not configured yet — copy .env.example to .env)');
  }
});
