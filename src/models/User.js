const mongoose = require('mongoose');

/**
 * Portfolio entry — one character position held by the user.
 */
const portfolioEntrySchema = new mongoose.Schema(
  {
    characterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Character',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    // Weighted average cost basis for profit/loss display
    averageBuyPrice: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * User Model
 *
 * Represents a player in the stock market.
 * Linked to their Discord identity, balance, and portfolio.
 */
const userSchema = new mongoose.Schema(
  {
    discordId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
      maxlength: 64,
    },

    profilePicture: {
      type: String,
      default: null,
    },

    // In-game currency balance
    balance: {
      type: Number,
      default: 100, // intentionally low economy
      min: 0,
    },

    portfolio: {
      type: [portfolioEntrySchema],
      default: [],
    },

    // Cached total portfolio value (updated on buy/sell, not real-time)
    totalValue: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ discordId: 1 });

/**
 * Find or create a user record for a given Discord interaction member.
 * Keeps username and avatar in sync automatically.
 */
userSchema.statics.findOrCreate = async function (member) {
  const discordId = member.id;
  const username = member.user.username;
  const profilePicture = member.user.displayAvatarURL({ size: 256 });

  let user = await this.findOne({ discordId });
  if (!user) {
    user = await this.create({ discordId, username, profilePicture });
  } else {
    // Keep display info current
    user.username = username;
    user.profilePicture = profilePicture;
    await user.save();
  }

  return user;
};

/**
 * Returns the portfolio entry for a specific character, or null.
 */
userSchema.methods.getPosition = function (characterId) {
  return this.portfolio.find(
    (p) => p.characterId.toString() === characterId.toString()
  ) || null;
};

module.exports = mongoose.model('User', userSchema);
