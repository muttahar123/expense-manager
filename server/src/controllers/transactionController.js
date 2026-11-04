import Transaction from '../models/Transaction.js';
import Investment from '../models/Investment.js';

// POST /api/transactions
export async function createTransaction(req, res, next) {
  try {
    const { type, amount, category, date, notes, bucket, investment } = req.body;

    const payload = {
      user: req.userId,
      type,
      amount,
      category,
      date: date || Date.now(),
      notes,
      bucket,
      investment: investment || null,
    };

    // If this is an Investment transaction, optionally spin up / top up a
    // Portfolio entry so PnL stays in sync.
    if (type === 'Investment' && !investment && req.body.assetType) {
      const created = await Investment.create({
        user: req.userId,
        assetName: category || req.body.assetName || 'Untitled',
        assetType: req.body.assetType,
        investedAmount: amount,
        currentValue: amount,
      });
      payload.investment = created._id;
    }

    const tx = await Transaction.create(payload);
    res.status(201).json(tx);
  } catch (err) {
    next(err);
  }
}

// GET /api/transactions?type=&from=&to=&limit=
export async function listTransactions(req, res, next) {
  try {
    const { type, from, to, limit = 100 } = req.query;
    const q = { user: req.userId };
    if (type) q.type = type;
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }

    const txs = await Transaction.find(q)
      .sort({ date: -1 })
      .limit(Math.min(Number(limit) || 100, 500))
      .populate('investment', 'assetName assetType');

    res.json(txs);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/transactions/:id
export async function deleteTransaction(req, res, next) {
  try {
    const deleted = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
