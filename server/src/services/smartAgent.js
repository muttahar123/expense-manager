/**
 * Zero-API Smart Agent
 * --------------------
 * A pure, dependency-free rule engine that mimics an "AI advisor" without any
 * external LLM. It ingests a user's transactions + investments and emits:
 *   1. Cashflow insights  — 50/30/20 benchmark checks.
 *   2. Investment insights — PnL / ROI analysis per asset class and overall.
 *
 * Every function is pure (no DB access) so it is trivially testable: the
 * controller fetches data and passes plain objects in.
 */

import { DEFAULT_BUDGET_RULE } from '../models/constants.js';

const round = (n) => Number((n || 0).toFixed(2));
const pct = (part, whole) => (whole > 0 ? round((part / whole) * 100) : 0);

/**
 * Summarize cashflow from a list of transactions.
 * @returns totals + per-bucket breakdown.
 */
export function summarizeCashflow(transactions = []) {
  const totals = { income: 0, expense: 0, investment: 0 };
  const buckets = { Needs: 0, Wants: 0, Investments: 0, Savings: 0 };

  for (const t of transactions) {
    if (t.type === 'Income') totals.income += t.amount;
    else if (t.type === 'Expense') totals.expense += t.amount;
    else if (t.type === 'Investment') totals.investment += t.amount;

    if (t.bucket && t.bucket !== 'Income') {
      buckets[t.bucket] = (buckets[t.bucket] || 0) + t.amount;
    }
  }

  // Savings = income not spent, not explicitly invested, minus what already
  // landed in the Savings bucket. We treat the residual as realized savings.
  const allocated = buckets.Needs + buckets.Wants + buckets.Investments;
  const residualSavings = Math.max(totals.income - allocated, 0);
  buckets.Savings = round(buckets.Savings + residualSavings);

  return {
    totals: {
      income: round(totals.income),
      expense: round(totals.expense),
      investment: round(totals.investment),
      net: round(totals.income - totals.expense - totals.investment),
    },
    buckets: {
      Needs: round(buckets.Needs),
      Wants: round(buckets.Wants),
      Investments: round(buckets.Investments),
      Savings: round(buckets.Savings),
    },
  };
}

/**
 * Compare bucket spending against the 50/30/20 rule and emit insights.
 */
export function cashflowInsights(transactions = [], budgetRule = DEFAULT_BUDGET_RULE) {
  const { totals, buckets } = summarizeCashflow(transactions);
  const insights = [];

  if (totals.income <= 0) {
    insights.push({
      level: 'info',
      category: 'Cashflow',
      message: 'No income logged yet this period. Add your salary to unlock the 50/30/20 analysis.',
    });
    return { summary: { totals, buckets }, insights };
  }

  const checks = [
    { key: 'Needs', limit: budgetRule.needs, label: 'needs (rent, bills, groceries)' },
    { key: 'Wants', limit: budgetRule.wants, label: 'wants (dining, shopping, fun)' },
    { key: 'Savings', limit: budgetRule.savings, label: 'savings & investments', isFloor: true },
  ];

  // Savings "floor" check combines explicit savings + investments.
  const savingsRate = pct(buckets.Savings + buckets.Investments, totals.income);

  for (const c of checks) {
    const share =
      c.key === 'Savings'
        ? savingsRate
        : pct(buckets[c.key], totals.income);

    if (c.isFloor) {
      if (share < c.limit) {
        insights.push({
          level: 'warning',
          category: c.key,
          message: `You're saving/investing ${share}% of income — below the ${c.limit}% target. Try to set aside a little more.`,
          share,
          benchmark: c.limit,
        });
      } else {
        insights.push({
          level: 'success',
          category: c.key,
          message: `Great — ${share}% of income is going to savings & investments, at or above the ${c.limit}% target.`,
          share,
          benchmark: c.limit,
        });
      }
    } else if (share > c.limit) {
      insights.push({
        level: 'warning',
        category: c.key,
        message: `Your ${c.label} are ${share}% of income, over the ${c.limit}% benchmark by ${round(share - c.limit)} points.`,
        share,
        benchmark: c.limit,
      });
    } else {
      insights.push({
        level: 'success',
        category: c.key,
        message: `Your ${c.label} are a healthy ${share}% of income (benchmark ${c.limit}%).`,
        share,
        benchmark: c.limit,
      });
    }
  }

  return { summary: { totals, buckets }, insights };
}

/**
 * Aggregate PnL across a portfolio of investments.
 * Accepts plain objects OR Mongoose docs (reads fields directly).
 */
export function portfolioSummary(investments = []) {
  let invested = 0;
  let current = 0;
  const byType = {};

  for (const inv of investments) {
    const investedAmount = inv.investedAmount || 0;
    const currentValue = inv.currentValue || 0;
    invested += investedAmount;
    current += currentValue;

    const t = inv.assetType || 'Other';
    if (!byType[t]) byType[t] = { invested: 0, current: 0 };
    byType[t].invested += investedAmount;
    byType[t].current += currentValue;
  }

  const pnl = current - invested;

  const classes = Object.entries(byType).map(([assetType, v]) => ({
    assetType,
    invested: round(v.invested),
    current: round(v.current),
    pnl: round(v.current - v.invested),
    roi: v.invested > 0 ? round(((v.current - v.invested) / v.invested) * 100) : 0,
  }));

  return {
    invested: round(invested),
    current: round(current),
    pnl: round(pnl),
    roi: invested > 0 ? round((pnl / invested) * 100) : 0,
    classes,
  };
}

/**
 * Turn portfolio numbers into plain-English investment insights.
 */
export function investmentInsights(investments = []) {
  const summary = portfolioSummary(investments);
  const insights = [];

  if (!investments.length) {
    insights.push({
      level: 'info',
      category: 'Portfolio',
      message: 'No investments tracked yet. Log your first holding to see PnL and ROI.',
    });
    return { summary, insights };
  }

  // Per-asset-class call-outs (gainers vs. laggards).
  const sorted = [...summary.classes].sort((a, b) => b.roi - a.roi);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  for (const c of summary.classes) {
    const dir = c.pnl >= 0 ? 'up' : 'down';
    insights.push({
      level: c.pnl >= 0 ? 'success' : 'warning',
      category: c.assetType,
      message: `${c.assetType} is ${dir} ${Math.abs(c.roi)}% (${c.pnl >= 0 ? '+' : ''}${c.pnl} on ${c.invested} invested).`,
      roi: c.roi,
      pnl: c.pnl,
    });
  }

  // Overall wealth verdict — the "stable / strong / cautious" headline.
  let headline;
  if (summary.roi > 10) {
    headline = `Overall wealth is strong: portfolio up ${summary.roi}% (+${summary.pnl}).`;
  } else if (summary.roi >= 0) {
    headline = `Overall wealth is stable: portfolio up ${summary.roi}% (+${summary.pnl}).`;
  } else if (summary.roi > -10) {
    headline = `Overall wealth is slightly down ${Math.abs(summary.roi)}% (${summary.pnl}), within normal volatility.`;
  } else {
    headline = `Caution: portfolio is down ${Math.abs(summary.roi)}% (${summary.pnl}). Review your laggards.`;
  }

  // Blended narrative when there's both a winner and a loser.
  if (best && worst && best.assetType !== worst.assetType && worst.pnl < 0 && best.pnl > 0) {
    headline =
      `Your ${worst.assetType} is down ${Math.abs(worst.roi)}%, but your ${best.assetType} ` +
      `is yielding ${best.roi}% profit. ${headline}`;
  }

  insights.unshift({ level: summary.pnl >= 0 ? 'success' : 'warning', category: 'Wealth', message: headline });

  return { summary, insights };
}

/**
 * Top-level entry point used by the /insights endpoint.
 */
export function generateInsights({ transactions = [], investments = [], budgetRule } = {}) {
  const cashflow = cashflowInsights(transactions, budgetRule);
  const investment = investmentInsights(investments);
  return {
    generatedAt: new Date().toISOString(),
    cashflow,
    investment,
    insights: [...cashflow.insights, ...investment.insights],
  };
}

export default generateInsights;
