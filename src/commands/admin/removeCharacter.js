const { SlashCommandBuilder } = require('discord.js');
const { removeCharacter } = require('../../services/characterService');
const { successEmbed } = require('../../utils/embeds');
const { requireAdmin } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-character')
    .setDescription('(Admin) Remove (deactivate) a character from the market.')
    .addStringOption((o) =>
      o.setName('name').setDescription('Character name').setRequired(true)
    ),

  async execute(interaction) {
    try {
      requireAdmin(interaction);
      const name = interaction.options.getString('name').trim();
      const character = await removeCharacter(name);
      await interaction.reply({
        embeds: [successEmbed('Character Removed', `**${character.name}** has been deactivated from the market.`)],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
