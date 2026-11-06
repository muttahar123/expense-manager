import generateInsights from '../services/smartAgent.js';
import { mapInvestment, mapProfile } from '../lib/mappers.js';

// GET /api/insights?from=&to=
// Runs the Zero-API Smart Agent over the signed-in user's data.
export async function getInsights(req, res, next) {
  try {
    const { from, to } = req.query;

    let txQuery = req.db.from('transactions').select('*');
    if (from) txQuery = txQuery.gte('date', new Date(from).toISOString());
    if (to) txQuery = txQuery.lte('date', new Date(to).toISOString());

    const [txRes, invRes, profRes] = await Promise.all([
      txQuery,
      req.db.from('investments').select('*'),
      req.db.from('profiles').select('*').eq('id', req.userId).maybeSingle(),
    ]);

    if (txRes.error) throw txRes.error;
    if (invRes.error) throw invRes.error;
    if (profRes.error) throw profRes.error;

    // Transactions only need amount/type/bucket for the agent — pass rows with
    // the fields it reads.
    const transactions = txRes.data.map((t) => ({
      type: t.type,
      amount: Number(t.amount) || 0,
      bucket: t.bucket,
    }));
    const investments = invRes.data.map(mapInvestment);
    const profile = profRes.data ? mapProfile(profRes.data) : null;

    const result = generateInsights({
      transactions,
      investments,
      budgetRule: profile?.budgetRule,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
