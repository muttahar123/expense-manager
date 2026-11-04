import Transaction from '../models/Transaction.js';
import Investment from '../models/Investment.js';
import User from '../models/User.js';
import generateInsights from '../services/smartAgent.js';

// GET /api/insights?from=&to=
// Runs the Zero-API Smart Agent over the user's data.
export async function getInsights(req, res, next) {
  try {
    const { from, to } = req.query;

    const txQuery = { user: req.userId };
    if (from || to) {
      txQuery.date = {};
      if (from) txQuery.date.$gte = new Date(from);
      if (to) txQuery.date.$lte = new Date(to);
    }

    const [transactions, investments, user] = await Promise.all([
      Transaction.find(txQuery).lean(),
      Investment.find({ user: req.userId }).lean(),
      User.findById(req.userId).lean(),
    ]);

    const result = generateInsights({
      transactions,
      investments,
      budgetRule: user?.budgetRule,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
