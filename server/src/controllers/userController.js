import { mapProfile, profileToRow } from '../lib/mappers.js';

/**
 * Fetch the caller's profile, creating it on first access if the signup
 * trigger (supabase/schema.sql) hasn't populated it yet. Keeps the app robust
 * even if someone forgets to install the trigger.
 */
async function ensureProfile(req) {
  const { data, error } = await req.db
    .from('profiles')
    .select('*')
    .eq('id', req.userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;

  const meta = req.user?.user_metadata || {};
  const { data: created, error: insErr } = await req.db
    .from('profiles')
    .insert({
      id: req.userId,
      email: req.user?.email,
      name: meta.full_name || meta.name || req.user?.email?.split('@')[0] || 'User',
    })
    .select('*')
    .single();
  if (insErr) throw insErr;
  return created;
}

// GET /api/me  → the current user's profile & preferences.
export async function getMe(req, res, next) {
  try {
    const profile = await ensureProfile(req);
    res.json(mapProfile(profile));
  } catch (err) {
    next(err);
  }
}

// PATCH /api/me  → update preferences (currency, salary, budget rule, goals).
export async function updateMe(req, res, next) {
  try {
    await ensureProfile(req); // guarantee the row exists before updating

    const updates = profileToRow(req.body);
    if (Object.keys(updates).length === 0) {
      const current = await ensureProfile(req);
      return res.json(mapProfile(current));
    }

    const { data, error } = await req.db
      .from('profiles')
      .update(updates)
      .eq('id', req.userId)
      .select('*')
      .single();
    if (error) throw error;

    res.json(mapProfile(data));
  } catch (err) {
    next(err);
  }
}
