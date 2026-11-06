import { admin, userClient, isConfigured } from '../config/supabase.js';

/**
 * Real authentication (replaces the old demo-user stand-in).
 *
 * The frontend signs in with Google via Supabase and sends the resulting
 * access token as `Authorization: Bearer <jwt>` on every API call. Here we:
 *   1. verify that token with Supabase,
 *   2. attach the resolved user (`req.user`, `req.userId`), and
 *   3. attach a request-scoped, RLS-enforced Supabase client (`req.db`) that
 *      can only read/write the authenticated user's own rows.
 *
 * Controllers stay auth-agnostic: they just use `req.db` and `req.userId`.
 */
export default async function requireAuth(req, res, next) {
  try {
    if (!isConfigured) {
      return res.status(503).json({
        error:
          'Server is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env ' +
          '(see .env.example) and run supabase/schema.sql.',
      });
    }

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ error: 'Not signed in.' });
    }

    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    req.user = data.user;
    req.userId = data.user.id;
    req.accessToken = token;
    req.db = userClient(token); // RLS-scoped to this user
    next();
  } catch (err) {
    next(err);
  }
}
