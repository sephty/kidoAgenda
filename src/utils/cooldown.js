const config = require('../config');

/**
 * In-memory cooldown tracker.
 *
 * Structure: Map<commandName, Map<userId, timestamp>>
 *
 * This is intentionally in-memory (not persisted) since cooldowns
 * are transient and reset on bot restart, which is acceptable.
 * 
 * IMPORTANT: Old entries are cleaned up every hour to prevent memory leaks.
 */
const cooldowns = new Map();
let cleanupIntervalId = null;

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
 * Clean up stale cooldown entries to prevent memory leaks.
 * Removes entries older than 1 hour.
 * Called automatically every hour.
 */
function cleanupStaleCooldowns() {
  const NOW = Date.now();
  const MAX_AGE = 60 * 60 * 1000; // 1 hour
  let removedCount = 0;

  for (const [commandName, userMap] of cooldowns.entries()) {
    for (const [userId, timestamp] of userMap.entries()) {
      if (NOW - timestamp > MAX_AGE) {
        userMap.delete(userId);
        removedCount++;
      }
    }
    
    // Remove empty command entries
    if (userMap.size === 0) {
      cooldowns.delete(commandName);
    }
  }

  if (removedCount > 0) {
    console.log(`[Cooldown] Cleaned up ${removedCount} stale cooldown entries.`);
  }
}

/**
 * Start the automatic cleanup interval.
 * Should be called once at bot startup.
 */
function startCleanupInterval() {
  if (cleanupIntervalId) return; // Already running
  
  cleanupIntervalId = setInterval(cleanupStaleCooldowns, 60 * 60 * 1000); // Every hour
  cleanupIntervalId.unref(); // Allow process to exit if only this interval is running
  console.log('[Cooldown] Cleanup interval started (every hour).');
}

/**
 * Stop the cleanup interval.
 * Should be called on bot shutdown.
 */
function stopCleanupInterval() {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    console.log('[Cooldown] Cleanup interval stopped.');
  }
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

module.exports = { checkCooldown, setCooldown, useCooldown, startCleanupInterval, stopCleanupInterval };
