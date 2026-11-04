import mongoose from 'mongoose';
import {
  TRANSACTION_TYPES,
  BUCKETS,
  CATEGORY_TO_BUCKET,
} from './constants.js';

const { Schema, model } = mongoose;

const transactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than zero'],
    },

    category: { type: String, required: true, trim: true },

    // 50/30/20 bucket. Auto-derived for Expenses when omitted (see pre-validate).
    bucket: { type: String, enum: BUCKETS },

    date: { type: Date, default: Date.now, index: true },

    notes: { type: String, trim: true, maxlength: 500 },

    // When type === 'Investment', links the cash outflow to a Portfolio entry
    // so the Smart Agent can reconcile invested capital against current value.
    investment: { type: Schema.Types.ObjectId, ref: 'Investment', default: null },
  },
  { timestamps: true }
);

// Auto-assign the 50/30/20 bucket based on type + category.
transactionSchema.pre('validate', function assignBucket(next) {
  if (!this.bucket) {
    if (this.type === 'Income') this.bucket = 'Income';
    else if (this.type === 'Investment') this.bucket = 'Investments';
    else if (this.type === 'Expense') {
      this.bucket = CATEGORY_TO_BUCKET[this.category] || 'Wants';
    }
  }
  next();
});

// Common query pattern: a user's transactions over a date range.
transactionSchema.index({ user: 1, date: -1 });

export default model('Transaction', transactionSchema);
