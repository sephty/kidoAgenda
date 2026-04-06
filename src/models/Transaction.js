const mongoose = require('mongoose');

/**
 * Transaction Log Model
 *
 * Immutable record of all buy/sell/admin operations.
 * Used for audits, statistics, and fairness verification.
 */
const transactionSchema = new mongoose.Schema(
  {
    // Discord user ID who performed the transaction
    userId: {
      type: String,
      required: true,
    },

    // Character being traded (null for admin balance operations)
    characterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      default: null,
    },

    // Transaction type
    type: {
      type: String,
      enum: ['BUY', 'SELL', 'ADMIN_ADD', 'ADMIN_REMOVE'],
      required: true,
    },

    // Amount of shares/currency
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Price per unit at time of transaction
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },

    // Total value of transaction
    totalValue: {
      type: Number,
      required: true,
      min: 0,
    },

    // User balance before transaction
    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    // User balance after transaction
    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    // Circulating supply of character before transaction
    circulatingSupplyBefore: {
      type: Number,
      default: null,
    },

    // Circulating supply of character after transaction
    circulatingSupplyAfter: {
      type: Number,
      default: null,
    },

    // Optional admin reason/notes
    notes: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    immutable: ['userId', 'characterId', 'type', 'amount', 'pricePerUnit'], // Prevent edits
  }
);

// Indexes for fast queries
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ characterId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, createdAt: -1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
