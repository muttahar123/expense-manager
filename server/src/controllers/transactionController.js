import { deriveBucket, mapTransaction } from '../lib/mappers.js';

// POST /api/transactions
export async function createTransaction(req, res, next) {
  try {
    const { type, amount, category, date, notes, bucket, investment } = req.body;

    let investmentId = investment || null;

    // If this is an Investment transaction, optionally spin up a Portfolio
    // entry so PnL stays in sync (mirrors the old Mongoose behavior).
    if (type === 'Investment' && !investmentId && req.body.assetType) {
      const { data: inv, error: invErr } = await req.db
        .from('investments')
        .insert({
          user_id: req.userId,
          asset_name: category || req.body.assetName || 'Untitled',
          asset_type: req.body.assetType,
          invested_amount: amount,
          current_value: amount,
        })
        .select('*')
        .single();
      if (invErr) throw invErr;
      investmentId = inv.id;
    }

    const { data, error } = await req.db
      .from('transactions')
      .insert({
        user_id: req.userId,
        type,
        amount,
        category,
        bucket: deriveBucket({ type, category, bucket }),
        date: date ? new Date(date).toISOString() : new Date().toISOString(),
        notes: notes || null,
        investment_id: investmentId,
      })
      .select('*')
      .single();
    if (error) throw error;

    res.status(201).json(mapTransaction(data));
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions?type=&from=&to=&limit=
export async function listTransactions(req, res, next) {
  try {
    const { type, from, to, limit = 100 } = req.query;

    let query = req.db
      .from('transactions')
      .select('*, investment:investments(id, asset_name, asset_type)')
      .order('date', { ascending: false })
      .limit(Math.min(Number(limit) || 100, 500));

    if (type) query = query.eq('type', type);
    if (from) query = query.gte('date', new Date(from).toISOString());
    if (to) query = query.lte('date', new Date(to).toISOString());

    const { data, error } = await query;
    if (error) throw error;

    res.json(data.map(mapTransaction));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/transactions/:id
export async function deleteTransaction(req, res, next) {
  try {
    const { data, error } = await req.db
      .from('transactions')
      .delete()
      .eq('id', req.params.id)
      .select('id');
    if (error) throw error;
    if (!data.length) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
