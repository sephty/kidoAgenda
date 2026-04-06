const { SlashCommandBuilder } = require('discord.js');
const { getCharacter } = require('../../services/marketService');
const { characterEmbed } = require('../../utils/embeds');
const { useCooldown } = require('../../utils/cooldown');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('character')
    .setDescription('View detailed information about a specific character stock.')
    .addStringOption((o) =>
      o.setName('name').setDescription('Character name').setRequired(true)
    ),

  async execute(interaction) {
    try {
      useCooldown('character', interaction.user.id);

      const name = interaction.options.getString('name').trim();
      const character = await getCharacter(name);

      await interaction.reply({ embeds: [characterEmbed(character)] });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
