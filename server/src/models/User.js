import mongoose from 'mongoose';
import { DEFAULT_BUDGET_RULE } from './constants.js';

const { Schema, model } = mongoose;

const goalSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true, min: 0 },
    savedAmount: { type: Number, default: 0, min: 0 },
    targetDate: { type: Date },
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Preferences
    baseCurrency: { type: String, default: 'USD', uppercase: true, trim: true },

    // Salary cadence — used for smart defaults & Sankey "Total Salary" node.
    monthlySalary: { type: Number, default: 0, min: 0 },
    salaryDay: { type: Number, min: 1, max: 31, default: 1 }, // day of month

    // 50/30/20 benchmark (customizable). Should sum to 100.
    budgetRule: {
      needs: { type: Number, default: DEFAULT_BUDGET_RULE.needs },
      wants: { type: Number, default: DEFAULT_BUDGET_RULE.wants },
      savings: { type: Number, default: DEFAULT_BUDGET_RULE.savings },
    },

    financialGoals: { type: [goalSchema], default: [] },
  },
  { timestamps: true }
);

export default model('User', userSchema);
