// Shared enums used across models & the Smart Agent.

export const TRANSACTION_TYPES = ['Income', 'Expense', 'Investment'];

// 50/30/20 buckets. "Income" is unbucketed; "Savings" is residual.
export const BUCKETS = ['Needs', 'Wants', 'Investments', 'Savings', 'Income'];

export const INVESTMENT_ASSET_TYPES = [
  'Stocks',
  'Crypto',
  'Business',
  'Mutual Fund',
  'Real Estate',
  'Bonds',
  'Gold',
  'Other',
];

export const INVESTMENT_STATUS = ['Active', 'Closed'];

// Maps a free-form expense category to its 50/30/20 bucket.
// Used to auto-derive the bucket on Expense transactions.
export const CATEGORY_TO_BUCKET = {
  // Needs
  Rent: 'Needs',
  Mortgage: 'Needs',
  Utilities: 'Needs',
  Groceries: 'Needs',
  Transport: 'Needs',
  Insurance: 'Needs',
  Healthcare: 'Needs',
  Education: 'Needs',
  Debt: 'Needs',
  // Wants
  Dining: 'Wants',
  Entertainment: 'Wants',
  Shopping: 'Wants',
  Travel: 'Wants',
  Subscriptions: 'Wants',
  Hobbies: 'Wants',
  Gifts: 'Wants',
};

export const DEFAULT_BUDGET_RULE = { needs: 50, wants: 30, savings: 20 };
