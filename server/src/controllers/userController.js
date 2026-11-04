import User from '../models/User.js';

// GET /api/me  → the current user's profile & preferences.
export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/me  → update preferences (currency, salary, budget rule, goals).
export async function updateMe(req, res, next) {
  try {
    const updates = {};
    const fields = ['name', 'baseCurrency', 'monthlySalary', 'salaryDay', 'budgetRule', 'financialGoals'];
    for (const f of fields) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const user = await User.findByIdAndUpdate(req.userId, updates, {
      new: true,
      runValidators: true,
    }).lean();
    res.json(user);
  } catch (err) {
    next(err);
  }
}
