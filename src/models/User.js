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
      default: () => {
        const config = require('../config');
        return config.economy.startingBalance;
      },
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
 * Find or create a user record for a given Discord interaction member or user.
 * Keeps username and avatar in sync automatically.
 * 
 * @param {Object} memberOrUser - Discord member or user object
 * @param {string} discordId - The user's Discord ID (required)
 */
userSchema.statics.findOrCreate = async function (memberOrUser, discordId) {
  // Validate input
  if (!memberOrUser) {
    throw new Error('User/member object is required');
  }
  if (!discordId) {
    throw new Error('Discord ID is required');
  }

  // Extract username from either member.user or directly from user object
  const username = memberOrUser.user?.username || memberOrUser.username;
  if (!username) {
    throw new Error('Username is required');
  }

  // Get avatar URL from either member.user or directly from user object
  const avatarObj = memberOrUser.user || memberOrUser;
  let profilePicture = null;
  if (typeof avatarObj.displayAvatarURL === 'function') {
    profilePicture = avatarObj.displayAvatarURL({ size: 256 });
  } else if (avatarObj.avatar) {
    profilePicture = `https://cdn.discordapp.com/avatars/${discordId}/${avatarObj.avatar}.png?size=256`;
  }

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
