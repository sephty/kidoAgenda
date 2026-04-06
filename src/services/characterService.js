const Character = require('../models/Character');
const { Errors, AppError } = require('../utils/errors');
const { clampPrice, round2 } = require('./marketService');

/**
 * Character Service
 *
 * Handles CRUD operations for characters (stocks).
 * Used by admin commands.
 */

/**
 * Create a new character (stock).
 */
async function createCharacter({ name, description, profilePicture, price, volatility, reputation, totalSupply }) {
  const existing = await Character.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (existing) throw Errors.characterExists(name);

  const safePrice = clampPrice(round2(price));

  const character = await Character.create({
    name,
    description: description || '',
    profilePicture: profilePicture || null,
    price: safePrice,
    basePrice: safePrice,
    volatility: volatility ?? 1.0,
    reputation: reputation ?? 0,
    totalSupply: totalSupply ?? 1000,
    circulatingSupply: 0,
  });

  return character;
}

/**
 * Soft-delete a character by marking it inactive.
 * We don't hard-delete so portfolio history remains intact.
 */
async function removeCharacter(name) {
  const character = await Character.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (!character) throw Errors.notFound(`Character "${name}"`);

  character.isActive = false;
  await character.save();
  return character;
}

/**
 * Reset a character back to its basePrice, zero lastChange.
 */
async function resetCharacter(name) {
  const character = await Character.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (!character) throw Errors.notFound(`Character "${name}"`);

  character.price = character.basePrice;
  character.lastChange = 0;
  character.reputation = 0;
  character.isActive = true;
  await character.save();
  return character;
}

module.exports = { createCharacter, removeCharacter, resetCharacter };
