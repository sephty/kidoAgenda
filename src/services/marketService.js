const Character = require('../models/Character');
const config = require('../config');

/**
 * Market Service
 *
 * Handles all price calculation logic for the stock market.
 * All mutations go through these functions — never update price directly.
 */

/**
 * Clamps a price to the configured market bounds.
 * Guarantees we never store NaN, Infinity, or out-of-range values.
 */
function clampPrice(price) {
  if (!Number.isFinite(price) || isNaN(price)) {
    return config.market.minPrice;
  }
  return Math.max(config.market.minPrice, Math.min(config.market.maxPrice, price));
}

/**
 * Round to 2 decimal places (currency precision).
 */
function round2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Apply a custom market event to a character.
 * Flexible system where admins specify direction and impact amount.
 *
 * @param {string} characterName - Target character
 * @param {string} description - Event description (e.g., "Major victory in competition")
 * @param {string} direction - 'up' or 'down'
 * @param {number} amount - Impact percentage (0-200)
 * @returns {{ character, oldPrice, newPrice, changePercent, description }}
 */
async function applyEvent(characterName, description, direction, amount) {
  // Validate inputs
  if (!['up', 'down'].includes(direction)) {
    const { AppError } = require('../utils/errors');
    throw new AppError('Direction must be "up" or "down".', 'INVALID_DIRECTION');
  }

  if (amount < 0 || amount > 200) {
    const { AppError } = require('../utils/errors');
    throw new AppError('Impact amount must be between 0 and 200%.', 'INVALID_AMOUNT');
  }

  const character = await Character.findOne({ name: characterName });
  if (!character) {
    const { Errors } = require('../utils/errors');
    throw Errors.notFound(`Character "${characterName}"`);
  }

  const oldPrice = character.price;

  // Determine the percentage swing (negative if down, positive if up)
  let impactPercent = direction === 'up' ? amount : -amount;

  // Scale by volatility — higher volatility amplifies both gains and losses
  impactPercent = impactPercent * character.volatility;

  // Add a small random variance (±20% of the impactPercent) for market flavor
  const variance = impactPercent * 0.2 * (Math.random() * 2 - 1);
  impactPercent = impactPercent + variance;

  const newRawPrice = oldPrice * (1 + impactPercent / 100);
  const newPrice = clampPrice(round2(newRawPrice));

  const actualChangePercent = round2(((newPrice - oldPrice) / oldPrice) * 100);

  character.price = newPrice;
  character.lastChange = actualChangePercent;
  await character.save();

  return { character, oldPrice, newPrice, changePercent: actualChangePercent };
}

/**
 * Manually override a character's price (admin only).
 */
async function setPrice(characterName, newPrice) {
  const clamped = clampPrice(round2(newPrice));
  const character = await Character.findOneAndUpdate(
    { name: characterName },
    { price: clamped, lastChange: 0 },
    { new: true }
  );
  if (!character) {
    const { Errors } = require('../utils/errors');
    throw Errors.notFound(`Character "${characterName}"`);
  }
  return character;
}

/**
 * Apply market pressure from a buy transaction.
 * Each share purchased nudges the price up by a tiny fraction.
 *
 * @param {Character} character - Mongoose document
 * @param {number} amount - Shares being purchased
 */
async function applyBuyPressure(character, amount) {
  const impact = config.market.buyImpactFactor * amount;
  const newPrice = clampPrice(round2(character.price * (1 + impact)));
  const change = round2(((newPrice - character.price) / character.price) * 100);

  character.price = newPrice;
  character.lastChange = change;
  character.circulatingSupply = Math.min(
    character.totalSupply,
    character.circulatingSupply + amount
  );
  await character.save();
}

/**
 * Apply market pressure from a sell transaction.
 * Each share sold nudges the price down by a tiny fraction.
 */
async function applySellPressure(character, amount) {
  const impact = config.market.sellImpactFactor * amount;
  const newPrice = clampPrice(round2(character.price * (1 - impact)));
  const change = round2(((newPrice - character.price) / character.price) * 100);

  character.price = newPrice;
  character.lastChange = change;
  character.circulatingSupply = Math.max(0, character.circulatingSupply - amount);
  await character.save();
}

/**
 * Passive reputation drift: apply a tiny daily nudge to prices based on reputation.
 * Called on a schedule (e.g., every 24 hours).
 * Positive rep = slight upward drift; negative rep = slight downward drift.
 * Processes in batches to prevent timeouts on large character sets.
 */
async function applyPassiveDrift() {
  const BATCH_SIZE = 50;
  const characters = await Character.find({});
  let processed = 0;

  for (let i = 0; i < characters.length; i += BATCH_SIZE) {
    const batch = characters.slice(i, i + BATCH_SIZE);
    const updates = [];

    for (const char of batch) {
      if (char.reputation === 0) continue;

      // Max drift = ±0.5% per tick at full reputation
      const driftPercent = (char.reputation / 100) * 0.5;
      const newPrice = clampPrice(round2(char.price * (1 + driftPercent / 100)));
      char.price = newPrice;
      char.lastChange = round2(driftPercent);
      updates.push(char.save());
      processed++;
    }

    // Use allSettled to prevent one failure from breaking the batch
    await Promise.allSettled(updates);
  }

  console.log(`[MarketService] Passive drift applied to ${processed} character(s).`);
}

/**
 * Randomly adjust volatility for all characters.
 * Simulates real market conditions where volatility fluctuates over time.
 * Some characters get bigger swings, others become more stable.
 * Processes in batches to prevent timeouts.
 */
async function randomizeVolatility() {
  const BATCH_SIZE = 50;
  const characters = await Character.find({});
  let processed = 0;

  for (let i = 0; i < characters.length; i += BATCH_SIZE) {
    const batch = characters.slice(i, i + BATCH_SIZE);
    const updates = [];

    for (const char of batch) {
      // Generate random volatility change (±20% of current value)
      // This means it oscillates around the base value but with variance
      const volatilityDrift = 0.1 + Math.random() * 0.4; // Random between 0.1 and 0.5
      const driftDirection = Math.random() < 0.5 ? -1 : 1; // Random up or down
      
      let newVolatility = char.volatility + (volatilityDrift * driftDirection);
      
      // Clamp to valid range (0.1 - 5.0)
      newVolatility = Math.max(0.1, Math.min(5.0, newVolatility));
      
      char.volatility = round2(newVolatility);
      updates.push(char.save());
      processed++;
    }

    // Use allSettled to prevent one failure from breaking the batch
    await Promise.allSettled(updates);
  }

  console.log(`[MarketService] Volatility randomized for ${processed} character(s).`);
}

/**
 * Fetch all characters sorted by price (descending).
 */
async function getMarket() {
  return Character.find({}).sort({ price: -1 });
}

/**
 * Fetch a single character by name.
 */
async function getCharacter(name) {
  const char = await Character.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (!char) {
    const { Errors } = require('../utils/errors');
    throw Errors.notFound(`Character "${name}"`);
  }
  return char;
}

module.exports = {
  clampPrice,
  round2,
  applyEvent,
  setPrice,
  applyBuyPressure,
  applySellPressure,
  applyPassiveDrift,
  randomizeVolatility,
  getMarket,
  getCharacter,
};
