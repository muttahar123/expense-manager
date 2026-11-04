import mongoose from 'mongoose';
import { INVESTMENT_ASSET_TYPES, INVESTMENT_STATUS } from './constants.js';

const { Schema, model } = mongoose;

const investmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    assetName: { type: String, required: true, trim: true },

    assetType: {
      type: String,
      enum: INVESTMENT_ASSET_TYPES,
      required: true,
      index: true,
    },

    // Capital deployed (cost basis).
    investedAmount: { type: Number, required: true, min: 0 },

    // Latest known market/book value. Defaults to cost basis at creation
    // (0% PnL) until the user updates it.
    currentValue: { type: Number, required: true, min: 0 },

    status: { type: String, enum: INVESTMENT_STATUS, default: 'Active', index: true },

    // Optional metadata
    quantity: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Derived PnL metrics (never stored; always computed) ---

// Absolute profit/loss in base currency.
investmentSchema.virtual('pnl').get(function pnl() {
  return Number((this.currentValue - this.investedAmount).toFixed(2));
});

// Return on investment as a percentage.
investmentSchema.virtual('roi').get(function roi() {
  if (!this.investedAmount) return 0;
  return Number((((this.currentValue - this.investedAmount) / this.investedAmount) * 100).toFixed(2));
});

// Direction helper for the UI (up / down / flat).
investmentSchema.virtual('trend').get(function trend() {
  const diff = this.currentValue - this.investedAmount;
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'flat';
});

// Transactions that funded this investment (reverse link to Transaction.investment).
investmentSchema.virtual('fundingTransactions', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'investment',
});

investmentSchema.index({ user: 1, status: 1 });

export default model('Investment', investmentSchema);
