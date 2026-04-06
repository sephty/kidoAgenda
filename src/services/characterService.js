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
  try {
    // Check if character already exists (case-insensitive)
    const existing = await Character.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
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
  } catch (err) {
    // Handle MongoDB duplicate key error (E11000)
    if (err.code === 11000) {
      throw Errors.characterExists(name);
    }
    // Re-throw other errors
    throw err;
  }
}

/**
 * Hard-delete a character from the market.
 * This removes active trading but keeps transaction history intact.
 * Removes character from all user portfolios.
 */
async function removeCharacter(name) {
  const User = require('../models/User');
  const character = await Character.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (!character) throw Errors.notFound(`Character "${name}"`);

  // Remove from all user portfolios
  await User.updateMany(
    { 'portfolio.characterId': character._id },
    { $pull: { portfolio: { characterId: character._id } } }
  );

  // Hard delete the character
  await Character.deleteOne({ _id: character._id });
  
  return character;
}

/**
 * Reset a character back to its basePrice, zero lastChange, and neutral reputation.
 */
async function resetCharacter(name) {
  const character = await Character.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  if (!character) throw Errors.notFound(`Character "${name}"`);

  character.price = character.basePrice;
  character.lastChange = 0;
  character.reputation = 0;
  await character.save();
  return character;
}

module.exports = { createCharacter, removeCharacter, resetCharacter };
