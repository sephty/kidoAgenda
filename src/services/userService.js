const User = require('../models/User');
const Character = require('../models/Character');
const { Errors } = require('../utils/errors');
const { applyBuyPressure, applySellPressure, round2 } = require('./marketService');
const config = require('../config');

/**
 * User Service
 *
 * Handles all user-facing financial operations: buy, sell, balance management.
 * All write operations use atomic Mongoose saves to minimize race conditions.
 */

/**
 * Get or create user record from a Discord interaction member.
 */
async function getOrCreateUser(member) {
  return User.findOrCreate(member);
}

/**
 * Execute a buy order.
 *
 * @param {User} user - Mongoose User document
 * @param {Character} character - Mongoose Character document
 * @param {number} amount - Number of shares to buy
 * @returns {{ user, character, totalCost }}
 */
async function buyShares(user, character, amount) {
  const totalCost = round2(character.price * amount);

  // Validate funds
  if (user.balance < totalCost) {
    throw Errors.insufficientFunds(totalCost, user.balance);
  }

  // Check supply
  const availableShares = character.totalSupply - character.circulatingSupply;
  if (amount > availableShares) {
    const { AppError } = require('../utils/errors');
    throw new AppError(
      `Only ${availableShares} shares of ${character.name} are available.`,
      'INSUFFICIENT_SUPPLY'
    );
  }

  const pricePerShare = character.price;

  // Update or create portfolio position
  const existingPos = user.getPosition(character._id);
  if (existingPos) {
    // Recalculate weighted average buy price
    const totalShares = existingPos.amount + amount;
    const totalSpent = existingPos.averageBuyPrice * existingPos.amount + pricePerShare * amount;
    existingPos.averageBuyPrice = round2(totalSpent / totalShares);
    existingPos.amount = totalShares;
  } else {
    user.portfolio.push({
      characterId: character._id,
      amount,
      averageBuyPrice: pricePerShare,
    });
  }

  user.balance = round2(user.balance - totalCost);

  // Apply buy pressure to price
  await applyBuyPressure(character, amount);

  await user.save();

  return { user, character, totalCost, pricePerShare };
}

/**
 * Execute a sell order.
 *
 * @param {User} user - Mongoose User document
 * @param {Character} character - Mongoose Character document
 * @param {number} amount - Number of shares to sell
 * @returns {{ user, character, totalReceived }}
 */
async function sellShares(user, character, amount) {
  const existingPos = user.getPosition(character._id);

  if (!existingPos || existingPos.amount < amount) {
    throw Errors.insufficientShares(amount, existingPos?.amount ?? 0, character.name);
  }

  const pricePerShare = character.price;
  const totalReceived = round2(pricePerShare * amount);

  // Update portfolio
  existingPos.amount -= amount;
  if (existingPos.amount === 0) {
    // Remove position entirely
    user.portfolio = user.portfolio.filter(
      (p) => p.characterId.toString() !== character._id.toString()
    );
  }

  user.balance = round2(user.balance + totalReceived);

  // Guard against balance overflow
  if (user.balance > config.economy.maxBalance) {
    user.balance = config.economy.maxBalance;
  }

  // Apply sell pressure to price
  await applySellPressure(character, amount);

  await user.save();

  return { user, character, totalReceived, pricePerShare };
}

/**
 * Add currency balance to a user (admin).
 */
async function addBalance(discordId, amount) {
  const user = await User.findOne({ discordId });
  if (!user) throw Errors.notFound('User');

  user.balance = Math.min(config.economy.maxBalance, round2(user.balance + amount));
  await user.save();
  return user;
}

/**
 * Remove currency balance from a user (admin).
 */
async function removeBalance(discordId, amount) {
  const user = await User.findOne({ discordId });
  if (!user) throw Errors.notFound('User');

  if (user.balance < amount) {
    throw Errors.insufficientFunds(amount, user.balance);
  }

  user.balance = round2(user.balance - amount);
  await user.save();
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
 * Returns only positions where the character still exists and is active.
 */
async function getEnrichedPortfolio(user) {
  const characterIds = user.portfolio.map((p) => p.characterId);
  const characters = await Character.find({ _id: { $in: characterIds }, isActive: true });
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
