const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateUser, getEnrichedPortfolio } = require('../../services/userService');
const { portfolioEmbed } = require('../../utils/embeds');
const { useCooldown } = require('../../utils/cooldown');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('View your full investment portfolio.'),

  async execute(interaction) {
    try {
      useCooldown('portfolio', interaction.user.id);

      const user = await getOrCreateUser(interaction);
      const { positions } = await getEnrichedPortfolio(user);

      await interaction.reply({
        embeds: [portfolioEmbed(user, positions)],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
