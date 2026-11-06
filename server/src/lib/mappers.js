// Translates between Postgres (snake_case) rows and the camelCase shapes the
// frontend + Smart Agent already expect — so the migration from Mongoose to
// Supabase stays invisible above the data layer. Also re-derives the PnL
// virtuals that used to live on the Mongoose Investment model.

import { CATEGORY_TO_BUCKET } from '../models/constants.js';

const round = (n) => Number((Number(n) || 0).toFixed(2));

/** Derive the 50/30/20 bucket for a transaction (was a Mongoose pre-validate). */
export function deriveBucket({ type, category, bucket }) {
  if (bucket) return bucket;
  if (type === 'Income') return 'Income';
  if (type === 'Investment') return 'Investments';
  if (type === 'Expense') return CATEGORY_TO_BUCKET[category] || 'Wants';
  return undefined;
}

/** investments row -> API shape (with derived pnl / roi / trend). */
export function mapInvestment(row) {
  if (!row) return row;
  const investedAmount = Number(row.invested_amount) || 0;
  const currentValue = Number(row.current_value) || 0;
  const diff = currentValue - investedAmount;
  return {
    id: row.id,
    assetName: row.asset_name,
    assetType: row.asset_type,
    investedAmount,
    currentValue,
    status: row.status,
    quantity: row.quantity == null ? undefined : Number(row.quantity),
    notes: row.notes || undefined,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Derived metrics (never stored):
    pnl: round(diff),
    roi: investedAmount ? round((diff / investedAmount) * 100) : 0,
    trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
  };
}

/** investments API shape -> row for insert/update (only defined fields). */
export function investmentToRow(input = {}) {
  const row = {};
  if (input.assetName !== undefined) row.asset_name = input.assetName;
  if (input.assetType !== undefined) row.asset_type = input.assetType;
  if (input.investedAmount !== undefined) row.invested_amount = input.investedAmount;
  if (input.currentValue !== undefined) row.current_value = input.currentValue;
  if (input.status !== undefined) row.status = input.status;
  if (input.quantity !== undefined) row.quantity = input.quantity;
  if (input.notes !== undefined) row.notes = input.notes;
  if (input.closedAt !== undefined) row.closed_at = input.closedAt;
  return row;
}

/** transactions row -> API shape. `investment` is the populated holding, if any. */
export function mapTransaction(row) {
  if (!row) return row;
  const inv = row.investment || row.investments; // depends on join alias
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount) || 0,
    category: row.category,
    bucket: row.bucket,
    date: row.date,
    notes: row.notes || undefined,
    investment: inv
      ? { id: inv.id, assetName: inv.asset_name, assetType: inv.asset_type }
      : row.investment_id || null,
    createdAt: row.created_at,
  };
}

/** profiles row -> API shape (mirrors the old Mongo User document). */
export function mapProfile(row) {
  if (!row) return row;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    baseCurrency: row.base_currency,
    monthlySalary: Number(row.monthly_salary) || 0,
    salaryDay: row.salary_day,
    budgetRule: row.budget_rule,
    financialGoals: row.financial_goals || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** profile API shape -> row for update (only defined fields). */
export function profileToRow(input = {}) {
  const row = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.baseCurrency !== undefined) row.base_currency = input.baseCurrency;
  if (input.monthlySalary !== undefined) row.monthly_salary = input.monthlySalary;
  if (input.salaryDay !== undefined) row.salary_day = input.salaryDay;
  if (input.budgetRule !== undefined) row.budget_rule = input.budgetRule;
  if (input.financialGoals !== undefined) row.financial_goals = input.financialGoals;
  return row;
}
