import User from '../models/User.js';

/**
 * Lightweight stand-in for real auth (to be replaced in a later step).
 * Resolves a single demo user, creating one on first run, and attaches
 * `req.user` + `req.userId`. This keeps controllers auth-agnostic.
 */
let cachedId = null;

export default async function currentUser(req, res, next) {
  try {
    if (!cachedId) {
      let user = await User.findOne().sort({ createdAt: 1 });
      if (!user) {
        user = await User.create({
          name: 'Demo User',
          email: 'demo@wealth.app',
          baseCurrency: 'USD',
          monthlySalary: 0,
        });
      }
      cachedId = user._id;
      req.user = user;
    }
    req.userId = cachedId;
    next();
  } catch (err) {
    next(err);
  }
}
