// UI-side enums, kept in sync with the server's model constants.

export const TX_TYPES = [
  { key: 'Expense', label: 'Expense', color: 'expense' },
  { key: 'Income', label: 'Income', color: 'income' },
  { key: 'Investment', label: 'Investment', color: 'invest' },
];

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Groceries',
  'Utilities',
  'Transport',
  'Dining',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Insurance',
  'Education',
  'Subscriptions',
  'Travel',
  'Debt',
  'Gifts',
  'Hobbies',
];

export const INCOME_CATEGORIES = ['Salary', 'Bonus', 'Freelance', 'Dividends', 'Interest', 'Gift', 'Other'];

export const ASSET_TYPES = [
  'Stocks',
  'Crypto',
  'Business',
  'Mutual Fund',
  'Real Estate',
  'Bonds',
  'Gold',
  'Other',
];

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  PKR: '₨',
  JPY: '¥',
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
