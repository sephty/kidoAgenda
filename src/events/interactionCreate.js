const { Events } = require('discord.js');
const { replyWithError } = require('../utils/errors');

/**
 * Handles all incoming interactions.
 * Routes slash commands to their registered handler via client.commands.
 */
module.exports = {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction) {
    // We only handle chat input (slash) commands here.
    // Button/select-menu interactions would be handled separately.
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.warn(`[InteractionCreate] Unknown command received: ${interaction.commandName}`);
      return interaction.reply({
        content: 'Unknown command. It may have been removed or not deployed.',
        ephemeral: true,
      });
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      // Final safety net — command-level try/catch should catch first,
      // but this prevents unhandled rejections from crashing the bot.
      console.error(`[InteractionCreate] Uncaught error in /${interaction.commandName}:`, err);
      await replyWithError(interaction, err);
    }
  },
};
