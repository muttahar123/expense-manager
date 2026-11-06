import { Router } from 'express';
import requireAuth from '../middleware/auth.js';
import {
  createTransaction,
  listTransactions,
  deleteTransaction,
} from '../controllers/transactionController.js';
import {
  createInvestment,
  listInvestments,
  updateInvestment,
  deleteInvestment,
} from '../controllers/investmentController.js';
import { getInsights } from '../controllers/insightsController.js';
import { getMe, updateMe } from '../controllers/userController.js';

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Everything below requires a signed-in user (Supabase/Google JWT).
router.use(requireAuth);

// Current user / preferences
router.get('/me', getMe);
router.patch('/me', updateMe);

// Transactions (Omni-Input target)
router.post('/transactions', createTransaction);
router.get('/transactions', listTransactions);
router.delete('/transactions/:id', deleteTransaction);

// Investments / Portfolio
router.post('/investments', createInvestment);
router.get('/investments', listInvestments);
router.patch('/investments/:id', updateInvestment);
router.delete('/investments/:id', deleteInvestment);

// Zero-API Smart Agent
router.get('/insights', getInsights);

export default router;
