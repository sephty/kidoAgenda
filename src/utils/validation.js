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
 * Validates a non-negative float (e.g., balance that can be 0 or positive).
 */
function validateNonNegativeFloat(value, fieldName = 'value') {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) {
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
 * Uses multiple strategies to ensure role detection in Discord.js v14.
 */
async function requireAdmin(interaction) {
  try {
    const { adminRoleName } = require('../config').discord;
    
    // Strategy 1: Use interaction.member if available
    let member = interaction.member;
    
    if (!member || !member.roles?.cache) {
      console.log(`[Admin Check] Member object missing or no cached roles, fetching...`);
      
      if (!interaction.guild) {
        throw Errors.adminOnly();
      }
      
      // Strategy 2: Fetch member directly from guild API
      try {
        member = await interaction.guild.members.fetch({
          user: interaction.user.id,
          force: true, // Force API fetch, bypass cache
        });
        console.log(`[Admin Check] Fetched member from API`);
      } catch (err) {
        console.error(`[Admin Check] Failed to fetch member: ${err.message}`);
        throw Errors.adminOnly();
      }
    }

    if (!member) {
      throw Errors.adminOnly();
    }

    // Strategy 3: Check Administrator permission (highest priority)
    if (member.permissions?.has('Administrator')) {
      console.log(`[Admin Check] ✓ ${interaction.user.username} is server Administrator`);
      return;
    }

    // Strategy 4: Check for StockAdmin role by name (case-insensitive)
    const roles = member.roles?.cache;
    if (roles && roles.size > 0) {
      const roleNames = Array.from(roles.values()).map(r => r.name);
      console.log(`[Admin Check] ${interaction.user.username} has roles: ${roleNames.join(', ')}`);

      // Check by role name
      const hasRole = roles.some(role => {
        const match = role.name.toLowerCase() === adminRoleName.toLowerCase();
        if (match) console.log(`[Admin Check] ✓ Found matching role: "${role.name}"`);
        return match;
      });

      if (hasRole) return;

      // Role not found
      console.warn(`[Admin Check] ✗ ${interaction.user.username} has no "${adminRoleName}" role`);
    } else {
      console.warn(`[Admin Check] ✗ No roles cached for ${interaction.user.username}`);
    }

    throw Errors.adminOnly();

  } catch (err) {
    // Re-throw if it's already an admin error
    if (err.code === 'ADMIN_ONLY') throw err;
    
    console.error('[Admin Check] Error:', err.message || err);
    throw Errors.adminOnly();
  }
}

module.exports = {
  validatePositiveInt,
  validatePositiveFloat,
  validateNonNegativeFloat,
  validatePrice,
  validateCharacterName,
  validateUrl,
  validateVolatility,
  validateReputation,
  requireAdmin,
};
