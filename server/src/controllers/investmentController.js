import { portfolioSummary } from '../services/smartAgent.js';
import { mapInvestment, investmentToRow } from '../lib/mappers.js';

// POST /api/investments
export async function createInvestment(req, res, next) {
  try {
    const { assetName, assetType, investedAmount, currentValue, quantity, notes } = req.body;

    const { data, error } = await req.db
      .from('investments')
      .insert({
        user_id: req.userId,
        asset_name: assetName,
        asset_type: assetType,
        invested_amount: investedAmount,
        current_value: currentValue ?? investedAmount, // defaults to cost basis
        quantity: quantity ?? null,
        notes: notes ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;

    res.status(201).json(mapInvestment(data));
  } catch (err) {
    next(err);
  }
}

// GET /api/investments  → list + portfolio rollup (PnL, ROI)
export async function listInvestments(req, res, next) {
  try {
    const { data, error } = await req.db
      .from('investments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const investments = data.map(mapInvestment);
    res.json({
      investments, // each carries derived pnl / roi / trend
      summary: portfolioSummary(investments),
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/investments/:id  → update current value / status / etc.
export async function updateInvestment(req, res, next) {
  try {
    const updates = investmentToRow(req.body);
    if (req.body.status === 'Closed') updates.closed_at = new Date().toISOString();

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const { data, error } = await req.db
      .from('investments')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Investment not found' });

    res.json(mapInvestment(data));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/investments/:id
export async function deleteInvestment(req, res, next) {
  try {
    const { data, error } = await req.db
      .from('investments')
      .delete()
      .eq('id', req.params.id)
      .select('id');
    if (error) throw error;
    if (!data.length) return res.status(404).json({ error: 'Investment not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
