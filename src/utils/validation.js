const config = require('../config');
const { Errors } = require('./errors');

/**
 * Input validation helpers shared across commands.
 * Each function throws an AppError on failure, or returns the sanitized value.
 */

/**
 * Validates and parses a positive integer (e.g., share count).
 */
function validatePositiveInt(value, fieldName = 'amount') {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0 || n !== parseFloat(value)) {
    throw Errors.invalidAmount();
  }
  return n;
}

/**
 * Validates and parses a positive float (e.g., currency amount or price).
 */
function validatePositiveFloat(value, fieldName = 'value') {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw Errors.invalidAmount();
  }
  // Clamp to 2 decimal places to avoid floating-point drift
  return Math.round(n * 100) / 100;
}

/**
 * Validates a stock price, ensuring it falls within market bounds.
 */
function validatePrice(value) {
  const n = validatePositiveFloat(value, 'price');
  if (n < config.market.minPrice || n > config.market.maxPrice) {
    throw Errors.invalidPrice();
  }
  return n;
}

/**
 * Validates a character name: non-empty, trimmed, max length.
 */
function validateCharacterName(name) {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new (require('./errors').AppError)(
      'Character name cannot be empty.',
      'INVALID_NAME'
    );
  }
  if (name.trim().length > 64) {
    throw new (require('./errors').AppError)(
      'Character name cannot exceed 64 characters.',
      'INVALID_NAME'
    );
  }
  return name.trim();
}

/**
 * Validates a URL string (must start with http:// or https://).
 * Returns null for empty/missing values.
 */
function validateUrl(value) {
  if (!value) return null;
  if (!/^https?:\/\/.+/.test(value)) {
    throw new (require('./errors').AppError)(
      'URL must begin with http:// or https://',
      'INVALID_URL'
    );
  }
  return value;
}

/**
 * Validates volatility (0.1 – 5.0).
 */
function validateVolatility(value) {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0.1 || n > 5.0) {
    throw new (require('./errors').AppError)(
      'Volatility must be between 0.1 and 5.0.',
      'INVALID_VOLATILITY'
    );
  }
  return Math.round(n * 10) / 10;
}

/**
 * Validates reputation (-100 to 100).
 */
function validateReputation(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n < -100 || n > 100) {
    throw new (require('./errors').AppError)(
      'Reputation must be an integer between -100 and 100.',
      'INVALID_REPUTATION'
    );
  }
  return n;
}

/**
 * Checks that the interaction member has the admin role.
 */
function requireAdmin(interaction) {
  const { adminRoleName } = require('../config').discord;
  const hasRole = interaction.member.roles.cache.some(
    (r) => r.name === adminRoleName
  );
  if (!hasRole) throw Errors.adminOnly();
}

module.exports = {
  validatePositiveInt,
  validatePositiveFloat,
  validatePrice,
  validateCharacterName,
  validateUrl,
  validateVolatility,
  validateReputation,
  requireAdmin,
};
