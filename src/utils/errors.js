/**
 * Centralized error handling utilities.
 *
 * AppError is a typed error that carries a user-visible message
 * and an optional internal code for logging.
 */

class AppError extends Error {
  constructor(message, code = 'GENERIC_ERROR', httpStatus = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// Pre-defined error factories for common scenarios
const Errors = {
  notFound: (entity) =>
    new AppError(`${entity} not found.`, 'NOT_FOUND', 404),

  insufficientFunds: (needed, has) =>
    new AppError(
      `Insufficient balance. You need ${needed.toFixed(2)} but have ${has.toFixed(2)}.`,
      'INSUFFICIENT_FUNDS'
    ),

  insufficientShares: (needed, has, name) =>
    new AppError(
      `Insufficient shares. You need ${needed} shares of ${name} but hold ${has}.`,
      'INSUFFICIENT_SHARES'
    ),

  invalidAmount: () =>
    new AppError('Amount must be a positive number.', 'INVALID_AMOUNT'),

  invalidPrice: () =>
    new AppError('Price must be a positive number within allowed bounds.', 'INVALID_PRICE'),

  adminOnly: () =>
    new AppError('This command requires the StockAdmin role.', 'FORBIDDEN', 403),

  characterExists: (name) =>
    new AppError(`A character named "${name}" already exists.`, 'DUPLICATE'),

  cooldown: (secondsLeft) =>
    new AppError(
      `You are on cooldown. Please wait ${secondsLeft.toFixed(1)} more second(s).`,
      'COOLDOWN'
    ),

  overflow: (field) =>
    new AppError(`Value for "${field}" exceeds allowed limits.`, 'OVERFLOW'),
};

/**
 * Send a standardized error reply to a Discord interaction.
 * Always ephemeral so error messages are private to the user.
 */
async function replyWithError(interaction, error) {
  const message =
    error instanceof AppError
      ? error.message
      : 'An unexpected error occurred. Please try again.';

  // Log unexpected errors
  if (!(error instanceof AppError)) {
    console.error('[UnhandledError]', error);
  }

  const payload = { content: `**Error:** ${message}`, ephemeral: true };

  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (replyErr) {
    console.error('[replyWithError] Could not send error reply:', replyErr);
  }
}

module.exports = { AppError, Errors, replyWithError };
