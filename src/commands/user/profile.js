const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateUser, getEnrichedPortfolio } = require('../../services/userService');
const { profileEmbed } = require('../../utils/embeds');
const { useCooldown } = require('../../utils/cooldown');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your investor profile and net worth.'),

  async execute(interaction) {
    try {
      useCooldown('profile', interaction.user.id);

      const user = await getOrCreateUser(interaction);
      const { positions, totalValue } = await getEnrichedPortfolio(user);

      await interaction.reply({
        embeds: [profileEmbed(user, positions, totalValue)],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
