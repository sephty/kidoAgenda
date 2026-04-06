const { SlashCommandBuilder } = require('discord.js');
const { resetCharacter } = require('../../services/characterService');
const { characterEmbed } = require('../../utils/embeds');
const { requireAdmin } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-character')
    .setDescription('(Admin) Reset a character price and reputation to their base values.')
    .addStringOption((o) =>
      o.setName('name').setDescription('Character name').setRequired(true)
    ),

  async execute(interaction) {
    try {
      requireAdmin(interaction);
      const name = interaction.options.getString('name').trim();
      const character = await resetCharacter(name);

      await interaction.reply({ embeds: [characterEmbed(character)] });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
