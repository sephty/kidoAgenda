const User = require('../models/User');
const Character = require('../models/Character');
const { Errors, AppError } = require('../utils/errors');
const { applyBuyPressure, applySellPressure, round2, clampPrice } = require('./marketService');
const config = require('../config');

/**
 * User Service
 *
 * Handles all user-facing financial operations: buy, sell, balance management.
 * All write operations use atomic Mongoose saves to minimize race conditions.
 */

/**
 * Get or create user record from a Discord interaction.
 * Works with both guild members and DM user objects.
 */
async function getOrCreateUser(interaction) {
  // Always prefer member if available (guild context)
  const memberOrUser = interaction.member || interaction.user;
  const discordId = interaction.user?.id;

  if (!memberOrUser || !discordId) {
    throw new AppError(
      'Cannot create user: this command must be used where your profile is discoverable.',
      'INVALID_CONTEXT'
    );
  }

  return User.findOrCreate(memberOrUser, discordId);
}

/**
 * Execute a buy order with atomic transaction to prevent race conditions.
 *
 * @param {User} user - Mongoose User document (will be re-fetched within transaction)
 * @param {Character} character - Mongoose Character document (will be re-fetched within transaction)
 * @param {number} amount - Number of shares to buy
 * @returns {{ user, character, totalCost, pricePerShare }}
 */
async function buyShares(user, character, amount) {
  const mongoose = require('mongoose');
  const Transaction = require('../models/Transaction');
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Re-fetch within transaction to get locked/latest version
    const charLocked = await Character.findById(character._id).session(session);
    const userLocked = await User.findById(user._id).session(session);

    if (!charLocked) {
      throw Errors.notFound('Character');
    }
    if (!userLocked) {
      throw Errors.notFound('User');
    }

    const totalCost = round2(charLocked.price * amount);

    // Validate funds
    if (userLocked.balance < totalCost) {
      throw Errors.insufficientFunds(totalCost, userLocked.balance);
    }

    // Check supply
    const availableShares = charLocked.totalSupply - charLocked.circulatingSupply;
    if (amount > availableShares) {
      const { AppError } = require('../utils/errors');
      throw new AppError(
        'Cannot buy that many shares. Market is out of stock.',
        'INSUFFICIENT_SUPPLY'
      );
    }

    const pricePerShare = charLocked.price;
    const circulatingSupplyBefore = charLocked.circulatingSupply;
    const balanceBefore = userLocked.balance;

    // Update or create portfolio position
    const existingPos = userLocked.getPosition(charLocked._id);
    if (existingPos) {
      // Recalculate weighted average buy price
      const totalShares = existingPos.amount + amount;
      const totalSpent = existingPos.averageBuyPrice * existingPos.amount + pricePerShare * amount;
      existingPos.averageBuyPrice = round2(totalSpent / totalShares);
      existingPos.amount = totalShares;
    } else {
      userLocked.portfolio.push({
        characterId: charLocked._id,
        amount,
        averageBuyPrice: pricePerShare,
      });
    }

    userLocked.balance = round2(userLocked.balance - totalCost);

    // Apply buy pressure to character atomically
    const impact = config.market.buyImpactFactor * amount;
    const newPrice = clampPrice(round2(charLocked.price * (1 + impact)));
    const change = round2(((newPrice - charLocked.price) / charLocked.price) * 100);

    charLocked.price = newPrice;
    charLocked.lastChange = change;
    charLocked.circulatingSupply = Math.min(
      charLocked.totalSupply,
      charLocked.circulatingSupply + amount
    );

    // Atomic saves
    await charLocked.save({ session });
    await userLocked.save({ session });

    // Log transaction for audit trail
    await Transaction.create(
      [
        {
          userId: userLocked.discordId,
          characterId: charLocked._id,
          type: 'BUY',
          amount,
          pricePerUnit: pricePerShare,
          totalValue: totalCost,
          balanceBefore,
          balanceAfter: userLocked.balance,
          circulatingSupplyBefore,
          circulatingSupplyAfter: charLocked.circulatingSupply,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return { user: userLocked, character: charLocked, totalCost, pricePerShare };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Execute a sell order with atomic transaction to prevent race conditions.
 *
 * @param {User} user - Mongoose User document (will be re-fetched within transaction)
 * @param {Character} character - Mongoose Character document (will be re-fetched within transaction)
 * @param {number} amount - Number of shares to sell
 * @returns {{ user, character, totalReceived, pricePerShare }}
 */
async function sellShares(user, character, amount) {
  const mongoose = require('mongoose');
  const Transaction = require('../models/Transaction');
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Re-fetch within transaction
    const charLocked = await Character.findById(character._id).session(session);
    const userLocked = await User.findById(user._id).session(session);

    if (!charLocked) {
      throw Errors.notFound('Character');
    }
    if (!userLocked) {
      throw Errors.notFound('User');
    }

    const existingPos = userLocked.getPosition(charLocked._id);

    if (!existingPos || existingPos.amount < amount) {
      throw Errors.insufficientShares(amount, existingPos?.amount ?? 0, charLocked.name);
    }

    const pricePerShare = charLocked.price;
    const totalReceived = round2(pricePerShare * amount);
    const circulatingSupplyBefore = charLocked.circulatingSupply;
    const balanceBefore = userLocked.balance;

    // Update portfolio
    existingPos.amount -= amount;
    if (existingPos.amount === 0) {
      // Remove position entirely
      userLocked.portfolio = userLocked.portfolio.filter(
        (p) => p.characterId.toString() !== charLocked._id.toString()
      );
    }

    userLocked.balance = round2(userLocked.balance + totalReceived);

    // Guard against balance overflow
    if (userLocked.balance > config.economy.maxBalance) {
      userLocked.balance = config.economy.maxBalance;
    }

    // Apply sell pressure to character atomically
    const impact = config.market.sellImpactFactor * amount;
    const newPrice = clampPrice(round2(charLocked.price * (1 - impact)));
    const change = round2(((newPrice - charLocked.price) / charLocked.price) * 100);

    charLocked.price = newPrice;
    charLocked.lastChange = change;
    charLocked.circulatingSupply = Math.max(0, charLocked.circulatingSupply - amount);

    // Atomic saves
    await charLocked.save({ session });
    await userLocked.save({ session });

    // Log transaction for audit trail
    await Transaction.create(
      [
        {
          userId: userLocked.discordId,
          characterId: charLocked._id,
          type: 'SELL',
          amount,
          pricePerUnit: pricePerShare,
          totalValue: totalReceived,
          balanceBefore,
          balanceAfter: userLocked.balance,
          circulatingSupplyBefore,
          circulatingSupplyAfter: charLocked.circulatingSupply,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    return { user: userLocked, character: charLocked, totalReceived, pricePerShare };
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

/**
 * Add currency balance to a user (admin).
 */
async function addBalance(discordId, amount) {
  const Transaction = require('../models/Transaction');
  const user = await User.findOne({ discordId });
  if (!user) throw Errors.notFound('User');

  const balanceBefore = user.balance;
  user.balance = Math.min(config.economy.maxBalance, round2(user.balance + amount));
  await user.save();

  // Log admin action
  await Transaction.create({
    userId: discordId,
    characterId: null,
    type: 'ADMIN_ADD',
    amount,
    pricePerUnit: 1,
    totalValue: amount,
    balanceBefore,
    balanceAfter: user.balance,
    notes: 'Admin balance grant',
  });

  return user;
}

/**
 * Remove currency balance from a user (admin).
 */
async function removeBalance(discordId, amount) {
  const Transaction = require('../models/Transaction');
  const user = await User.findOne({ discordId });
  if (!user) throw Errors.notFound('User');

  if (user.balance < amount) {
    throw Errors.insufficientFunds(amount, user.balance);
  }

  const balanceBefore = user.balance;
  user.balance = round2(user.balance - amount);
  await user.save();

  // Log admin action
  await Transaction.create({
    userId: discordId,
    characterId: null,
    type: 'ADMIN_REMOVE',
    amount,
    pricePerUnit: 1,
    totalValue: amount,
    balanceBefore,
    balanceAfter: user.balance,
    notes: 'Admin balance deduction',
  });

  return user;
}

/**
 * Reset a user's balance and portfolio to defaults (admin).
 */
async function resetUser(discordId) {
  const user = await User.findOne({ discordId });
  if (!user) throw Errors.notFound('User');

  user.balance = config.economy.startingBalance;
  user.portfolio = [];
  user.totalValue = 0;
  await user.save();
  return user;
}

/**
 * Build enriched portfolio positions by populating character data.
 * Returns only positions where the character still exists.
 */
async function getEnrichedPortfolio(user) {
  const characterIds = user.portfolio.map((p) => p.characterId);
  const characters = await Character.find({ _id: { $in: characterIds } });
  const charMap = new Map(characters.map((c) => [c._id.toString(), c]));

  const positions = [];
  let totalValue = user.balance;

  for (const pos of user.portfolio) {
    const char = charMap.get(pos.characterId.toString());
    if (!char) continue; // character removed from market

    const currentValue = round2(char.price * pos.amount);
    totalValue = round2(totalValue + currentValue);

    positions.push({
      character: char,
      amount: pos.amount,
      avgBuy: pos.averageBuyPrice,
      currentValue,
    });
  }

  return { positions, totalValue };
}

module.exports = {
  getOrCreateUser,
  buyShares,
  sellShares,
  addBalance,
  removeBalance,
  resetUser,
  getEnrichedPortfolio,
};
