import Investment from '../models/Investment.js';
import { portfolioSummary } from '../services/smartAgent.js';

// POST /api/investments
export async function createInvestment(req, res, next) {
  try {
    const { assetName, assetType, investedAmount, currentValue, quantity, notes } = req.body;
    const inv = await Investment.create({
      user: req.userId,
      assetName,
      assetType,
      investedAmount,
      currentValue: currentValue ?? investedAmount, // defaults to cost basis
      quantity,
      notes,
    });
    res.status(201).json(inv);
  } catch (err) {
    next(err);
  }
}

// GET /api/investments  → list + portfolio rollup (PnL, ROI)
export async function listInvestments(req, res, next) {
  try {
    const investments = await Investment.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json({
      investments, // virtuals (pnl, roi, trend) serialized via toJSON
      summary: portfolioSummary(investments),
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/investments/:id  → update current value / status
export async function updateInvestment(req, res, next) {
  try {
    const updates = {};
    const fields = ['assetName', 'assetType', 'investedAmount', 'currentValue', 'status', 'quantity', 'notes'];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    if (updates.status === 'Closed') updates.closedAt = new Date();

    const inv = await Investment.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      updates,
      { new: true, runValidators: true }
    );
    if (!inv) return res.status(404).json({ error: 'Investment not found' });
    res.json(inv);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/investments/:id
export async function deleteInvestment(req, res, next) {
  try {
    const deleted = await Investment.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!deleted) return res.status(404).json({ error: 'Investment not found' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
