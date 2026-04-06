const mongoose = require('mongoose');

/**
 * Character (Stock) Model
 *
 * Each character represents a tradeable "stock" in the roleplay market.
 * Price is dynamic and influenced by events, reputation, and trading volume.
 */
const characterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 64,
    },

    description: {
      type: String,
      default: '',
      maxlength: 512,
    },

    profilePicture: {
      type: String,
      default: null,
      validate: {
        validator: (v) => v === null || /^https?:\/\/.+/.test(v),
        message: 'profilePicture must be a valid URL or null.',
      },
    },

    // Current market price
    price: {
      type: Number,
      required: true,
      min: 0.01,
    },

    // Original/reference price used for percentage calculations and resets
    basePrice: {
      type: Number,
      required: true,
      min: 0.01,
    },

    /**
     * Volatility (0.1 – 2.0 recommended)
     * Low volatility = stable, slow-moving stock.
     * High volatility = dramatic swings from events.
     */
    volatility: {
      type: Number,
      default: 1.0,
      min: 0.1,
      max: 5.0,
    },

    /**
     * Reputation (-100 to +100)
     * Provides a long-term upward or downward drift.
     * Positive = slow passive growth; Negative = slow passive decay.
     */
    reputation: {
      type: Number,
      default: 0,
      min: -100,
      max: 100,
    },

    // Percentage change from the last event or tick (+/-)
    lastChange: {
      type: Number,
      default: 0,
    },

    // Total shares available (optional; used for supply-demand logic)
    totalSupply: {
      type: Number,
      default: 1000,
      min: 1,
    },

    // Total shares currently held by all users (tracked for market pressure)
    circulatingSupply: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// Index for fast lookup by name (case-insensitive search)
// Unique index - character names are unique across the market
characterSchema.index({ name: 1 }, { unique: true, sparse: true });
characterSchema.index({ price: -1 });

/**
 * Returns the price change as a percentage relative to basePrice.
 */
characterSchema.virtual('changeFromBase').get(function () {
  return (((this.price - this.basePrice) / this.basePrice) * 100).toFixed(2);
});

module.exports = mongoose.model('Character', characterSchema);
