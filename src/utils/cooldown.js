const config = require('../config');

/**
 * In-memory cooldown tracker.
 *
 * Structure: Map<commandName, Map<userId, timestamp>>
 *
 * This is intentionally in-memory (not persisted) since cooldowns
 * are transient and reset on bot restart, which is acceptable.
 */
const cooldowns = new Map();

/**
 * Check whether a user is on cooldown for a given command.
 *
 * @param {string} commandName
 * @param {string} userId
 * @returns {{ onCooldown: boolean, remainingSeconds: number }}
 */
function checkCooldown(commandName, userId) {
  const cooldownMs = config.cooldowns[commandName] ?? 0;
  if (cooldownMs === 0) return { onCooldown: false, remainingSeconds: 0 };

  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }

  const timestamps = cooldowns.get(commandName);
  const now = Date.now();
  const lastUsed = timestamps.get(userId) ?? 0;
  const elapsed = now - lastUsed;

  if (elapsed < cooldownMs) {
    const remaining = (cooldownMs - elapsed) / 1000;
    return { onCooldown: true, remainingSeconds: remaining };
  }

  return { onCooldown: false, remainingSeconds: 0 };
}

/**
 * Record that a user just used a command, starting their cooldown.
 */
function setCooldown(commandName, userId) {
  if (!cooldowns.has(commandName)) {
    cooldowns.set(commandName, new Map());
  }
  cooldowns.get(commandName).set(userId, Date.now());
}

/**
 * Convenience: check then set. Throws AppError if on cooldown.
 * DEPRECATED: Use checkCooldown + setCooldown separately for better control.
 * Call this only for non-critical commands without transaction logic.
 */
function useCooldown(commandName, userId) {
  const { onCooldown, remainingSeconds } = checkCooldown(commandName, userId);
  if (onCooldown) {
    const { Errors } = require('./errors');
    throw Errors.cooldown(remainingSeconds);
  }
  setCooldown(commandName, userId);
}

module.exports = { checkCooldown, setCooldown, useCooldown };
