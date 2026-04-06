const { SlashCommandBuilder } = require('discord.js');
const { getMarket } = require('../../services/marketService');
const { marketEmbed } = require('../../utils/embeds');
const { useCooldown } = require('../../utils/cooldown');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('market')
    .setDescription('View all active characters on the market.')
    .addIntegerOption((o) =>
      o
        .setName('limit')
        .setDescription('How many characters to show (default 10, max 25)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      useCooldown('market', interaction.user.id);
      
      // Defer for potentially slow database query
      await interaction.deferReply();

      const limit = Math.min(interaction.options.getInteger('limit') ?? 10, 25);
      const characters = await getMarket();
      const sliced = characters.slice(0, limit);

      await interaction.editReply({ embeds: [marketEmbed(sliced)] });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
