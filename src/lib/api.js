import { supabase } from './supabase.js';

// The app talks to Supabase directly. Supabase Auth supplies the user's JWT and
// Postgres RLS policies in supabase/schema.sql scope every query to that user.
const CATEGORY_TO_BUCKET = {
  Rent: 'Needs', Mortgage: 'Needs', Utilities: 'Needs', Groceries: 'Needs',
  Transport: 'Needs', Insurance: 'Needs', Healthcare: 'Needs', Education: 'Needs', Debt: 'Needs',
  Dining: 'Wants', Entertainment: 'Wants', Shopping: 'Wants', Travel: 'Wants',
  Subscriptions: 'Wants', Hobbies: 'Wants', Gifts: 'Wants',
};
const DEFAULT_BUDGET_RULE = { needs: 50, wants: 30, savings: 20 };
const round = (n) => Number((Number(n) || 0).toFixed(2));
const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

function mapInvestment(row) {
  const investedAmount = Number(row.invested_amount) || 0;
  const currentValue = Number(row.current_value) || 0;
  const realizedValue = Number(row.realized_value) || 0;
  const pnl = round(currentValue + realizedValue - investedAmount);
  return {
    id: row.id, assetName: row.asset_name, assetType: row.asset_type,
    investedAmount, currentValue, realizedValue, status: row.status,
    quantity: row.quantity == null ? undefined : Number(row.quantity),
    notes: row.notes || undefined, openedAt: row.opened_at, closedAt: row.closed_at,
    createdAt: row.created_at, updatedAt: row.updated_at, pnl,
    roi: investedAmount ? round((pnl / investedAmount) * 100) : 0,
    trend: pnl > 0 ? 'up' : pnl < 0 ? 'down' : 'flat',
  };
}

function mapTransaction(row) {
  const investment = row.investment || row.investments;
  return {
    id: row.id, type: row.type, amount: Number(row.amount) || 0,
    category: row.category, bucket: row.bucket, date: row.date,
    notes: row.notes || undefined,
    investment: investment ? { id: investment.id, assetName: investment.asset_name, assetType: investment.asset_type } : row.investment_id || null,
    createdAt: row.created_at,
  };
}

function mapProfile(row) {
  return {
    id: row.id, name: row.name, email: row.email, baseCurrency: row.base_currency,
    monthlySalary: Number(row.monthly_salary) || 0, salaryDay: row.salary_day,
    budgetRule: row.budget_rule, financialGoals: row.financial_goals || [],
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function getProfileRow() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Please sign in to access your profile.');
  let result = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (result.error) throw result.error;
  if (result.data) return result.data;
  result = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
  }).select('*').single();
  return unwrap(result);
}

export async function getMe() { return mapProfile(await getProfileRow()); }

export async function updateMe(input) {
  const current = await getProfileRow();
  const updates = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.baseCurrency !== undefined) updates.base_currency = input.baseCurrency;
  if (input.monthlySalary !== undefined) updates.monthly_salary = input.monthlySalary;
  if (input.salaryDay !== undefined) updates.salary_day = input.salaryDay;
  if (input.budgetRule !== undefined) updates.budget_rule = input.budgetRule;
  if (input.financialGoals !== undefined) updates.financial_goals = input.financialGoals;
  if (!Object.keys(updates).length) return mapProfile(current);
  return mapProfile(unwrap(await supabase.from('profiles').update(updates).eq('id', current.id).select('*').single()));
}

export async function createTransaction(input) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Please sign in to add a transaction.');
  let investmentId = input.investment || null;
  if (input.type === 'Investment' && !investmentId && input.assetType) {
    const row = unwrap(await supabase.from('investments').insert({
      user_id: user.id, asset_name: input.category || input.assetName || 'Untitled',
      asset_type: input.assetType, invested_amount: input.amount, current_value: input.amount,
    }).select('*').single());
    investmentId = row.id;
  }
  const bucket = input.bucket || (input.type === 'Income' ? 'Income' : input.type === 'Investment' ? 'Investments' : CATEGORY_TO_BUCKET[input.category] || 'Wants');
  const row = unwrap(await supabase.from('transactions').insert({
    user_id: user.id, type: input.type, amount: input.amount, category: input.category,
    bucket, date: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
    notes: input.notes || null, investment_id: investmentId,
  }).select('*').single());
  return mapTransaction(row);
}

export async function createInvestmentReturn(input) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Please sign in to add a return.');
  const investment = unwrap(await supabase.from('investments').select('*').eq('id', input.investmentId).single());
  const amount = Number(input.amount);
  const updates = { realized_value: (Number(investment.realized_value) || 0) + amount };
  if (input.sale) {
    updates.current_value = Math.max(0, Number(investment.current_value) - amount);
    if (updates.current_value === 0) updates.status = 'Closed';
  }
  unwrap(await supabase.from('investments').update(updates).eq('id', investment.id).select('id').single());
  const row = unwrap(await supabase.from('transactions').insert({
    user_id: user.id, type: 'Income', amount, category: input.sale ? 'Investment sale' : 'Investment return',
    bucket: 'Income', date: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
    notes: input.notes || null, investment_id: investment.id,
  }).select('*').single());
  return mapTransaction(row);
}

export async function listTransactions(params = {}) {
  let query = supabase.from('transactions').select('*, investment:investments(id, asset_name, asset_type)').order('date', { ascending: false }).limit(Math.min(Number(params.limit) || 100, 500));
  if (params.type) query = query.eq('type', params.type);
  if (params.from) query = query.gte('date', new Date(params.from).toISOString());
  if (params.to) query = query.lte('date', new Date(params.to).toISOString());
  return unwrap(await query).map(mapTransaction);
}

export async function deleteTransaction(id) {
  const rows = unwrap(await supabase.from('transactions').delete().eq('id', id).select('id'));
  if (!rows.length) throw new Error('Transaction not found.');
  return { ok: true };
}

export async function createInvestment(input) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Please sign in to add an investment.');
  const row = unwrap(await supabase.from('investments').insert({
    user_id: user.id, asset_name: input.assetName, asset_type: input.assetType,
    invested_amount: input.investedAmount, current_value: input.currentValue ?? input.investedAmount,
    quantity: input.quantity ?? null, notes: input.notes ?? null,
  }).select('*').single());
  return mapInvestment(row);
}

function portfolioSummary(investments) {
  const invested = investments.reduce((sum, item) => sum + item.investedAmount, 0);
  const current = investments.reduce((sum, item) => sum + item.currentValue + item.realizedValue, 0);
  const classes = Object.values(investments.reduce((groups, item) => {
    const type = item.assetType || 'Other';
    groups[type] ||= { assetType: type, invested: 0, current: 0 };
    groups[type].invested += item.investedAmount;
    groups[type].current += item.currentValue + item.realizedValue;
    return groups;
  }, {})).map((item) => {
    const pnl = item.current - item.invested;
    return { ...item, invested: round(item.invested), current: round(item.current), pnl: round(pnl), roi: item.invested ? round(pnl / item.invested * 100) : 0 };
  });
  const pnl = current - invested;
  return { invested: round(invested), current: round(current), pnl: round(pnl), roi: invested ? round(pnl / invested * 100) : 0, classes };
}

export async function listInvestments() {
  const rows = unwrap(await supabase.from('investments').select('*').order('created_at', { ascending: false }));
  const investments = rows.map(mapInvestment);
  return { investments, summary: portfolioSummary(investments) };
}

export async function updateInvestment(id, input) {
  const updates = {};
  if (input.assetName !== undefined) updates.asset_name = input.assetName;
  if (input.assetType !== undefined) updates.asset_type = input.assetType;
  if (input.investedAmount !== undefined) updates.invested_amount = input.investedAmount;
  if (input.currentValue !== undefined) updates.current_value = input.currentValue;
  if (input.status !== undefined) updates.status = input.status;
  if (input.quantity !== undefined) updates.quantity = input.quantity;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.closedAt !== undefined) updates.closed_at = input.closedAt;
  if (input.status === 'Closed') updates.closed_at = new Date().toISOString();
  if (!Object.keys(updates).length) throw new Error('No valid fields to update.');
  return mapInvestment(unwrap(await supabase.from('investments').update(updates).eq('id', id).select('*').single()));
}

const pct = (part, whole) => whole > 0 ? round(part / whole * 100) : 0;
function makeInsights(transactions, investments, budgetRule = DEFAULT_BUDGET_RULE) {
  const totals = { income: 0, expense: 0, investment: 0 };
  const buckets = { Needs: 0, Wants: 0, Investments: 0, Savings: 0 };
  const expenseCategories = {};
  transactions.forEach((t) => {
    if (t.type === 'Income') totals.income += t.amount;
    else if (t.type === 'Expense') {
      totals.expense += t.amount;
      expenseCategories[t.category || 'Other'] = (expenseCategories[t.category || 'Other'] || 0) + t.amount;
    }
    else if (t.type === 'Investment') totals.investment += t.amount;
    if (t.bucket && t.bucket !== 'Income') buckets[t.bucket] = (buckets[t.bucket] || 0) + t.amount;
  });
  buckets.Savings = round(buckets.Savings + Math.max(totals.income - buckets.Needs - buckets.Wants - buckets.Investments, 0));
  Object.keys(totals).forEach((key) => { totals[key] = round(totals[key]); });
  totals.net = round(totals.income - totals.expense - totals.investment);
  totals.available = totals.net;
  Object.keys(buckets).forEach((key) => { buckets[key] = round(buckets[key]); });
  const cashInsights = [];
  if (totals.income <= 0) cashInsights.push({ level: 'info', category: 'Cashflow', message: 'No income logged yet this period. Add your salary to unlock the 50/30/20 analysis.' });
  else {
    const wantsShare = pct(buckets.Wants, totals.income);
    const topWant = Object.entries(expenseCategories)
      .filter(([category]) => CATEGORY_TO_BUCKET[category] === 'Wants')
      .sort((a, b) => b[1] - a[1])[0];
    if (wantsShare > (Number(budgetRule.wants) || 30)) {
      cashInsights.push({
        level: 'warning', category: 'Flexible spending',
        message: `You spent ${wantsShare}% of this month's income on wants, above your ${budgetRule.wants || 30}% guide.${topWant ? ` ${topWant[0]} was the biggest at ${round(topWant[1])}. Consider setting a limit for the rest of the month.` : ' Try setting a limit for the rest of the month.'}`,
      });
    } else if (totals.expense > totals.income * 0.5) {
      cashInsights.push({ level: 'warning', category: 'Spending check', message: `Everyday expenses are ${pct(totals.expense, totals.income)}% of this month's income. Review the category breakdown and pause any non-essential purchases if you can.` });
    } else if (totals.available > 0) {
      cashInsights.push({ level: 'success', category: 'Good progress', message: `You have ${totals.available} left after logged expenses and investments this month. Consider keeping some aside for savings.` });
    } else if (totals.available < 0) {
      cashInsights.push({ level: 'warning', category: 'Cash check', message: `Your recorded spending and investments are ${Math.abs(totals.available)} more than this month's income. Review recent entries and try to pause flexible spending.` });
    }
    const savingShare = pct(buckets.Savings + buckets.Investments, totals.income);
    const savingTarget = Number(budgetRule.savings) || 20;
    cashInsights.push(savingShare >= savingTarget
      ? { level: 'success', category: 'Saving', message: `Nice work — you’ve put ${savingShare}% of this month’s income towards savings and investments.` }
      : { level: 'info', category: 'Saving idea', message: `You’ve put ${savingShare}% towards savings and investments so far. If it fits your budget, try setting a little aside before other spending.` });
  }
  const portfolio = portfolioSummary(investments);
  const investmentInsights = investments.length
    ? portfolio.classes.map((item) => ({ level: item.pnl >= 0 ? 'success' : 'warning', category: item.assetType, message: `${item.assetType} is ${item.pnl >= 0 ? 'up' : 'down'} ${Math.abs(item.roi)}% (${item.pnl >= 0 ? '+' : ''}${item.pnl} on ${item.invested} invested).`, roi: item.roi, pnl: item.pnl }))
    : [{ level: 'info', category: 'Portfolio', message: 'No investments tracked yet. Log your first holding to see PnL and ROI.' }];
  investmentInsights.unshift({ level: portfolio.pnl >= 0 ? 'success' : 'warning', category: 'Wealth', message: portfolio.roi > 10 ? `Overall wealth is strong: portfolio up ${portfolio.roi}% (+${portfolio.pnl}).` : portfolio.roi >= 0 ? `Overall wealth is stable: portfolio up ${portfolio.roi}% (+${portfolio.pnl}).` : portfolio.roi > -10 ? `Overall wealth is slightly down ${Math.abs(portfolio.roi)}% (${portfolio.pnl}), within normal volatility.` : `Caution: portfolio is down ${Math.abs(portfolio.roi)}% (${portfolio.pnl}). Review your laggards.` });
  const categoryDetails = Object.entries(expenseCategories)
    .map(([category, amount]) => ({ category, amount: round(amount) }))
    .sort((a, b) => b.amount - a.amount);
  return { generatedAt: new Date().toISOString(), cashflow: { summary: { totals, buckets, expenseCategories: categoryDetails }, insights: cashInsights }, investment: { summary: portfolio, insights: investmentInsights }, insights: [...cashInsights, ...investmentInsights] };
}

export async function getInsights(params = {}) {
  let query = supabase.from('transactions').select('*');
  if (params.from) query = query.gte('date', new Date(params.from).toISOString());
  if (params.to) query = query.lte('date', new Date(params.to).toISOString());
  const [transactions, investmentRows, profile] = await Promise.all([
    query.then(unwrap),
    supabase.from('investments').select('*').then(unwrap),
    getProfileRow(),
  ]);
  return makeInsights(transactions.map((t) => ({ type: t.type, amount: Number(t.amount) || 0, bucket: t.bucket, category: t.category })), investmentRows.map(mapInvestment), profile.budget_rule || DEFAULT_BUDGET_RULE);
}
