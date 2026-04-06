const { SlashCommandBuilder } = require('discord.js');
const { removeCharacter } = require('../../services/characterService');
const { successEmbed } = require('../../utils/embeds');
const { requireAdmin } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-character')
    .setDescription('(Admin) Remove a character from the market (permanent).')
    .addStringOption((o) =>
      o.setName('name').setDescription('Character name').setRequired(true)
    ),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);
      await interaction.deferReply();
      
      const name = interaction.options.getString('name').trim();
      const character = await removeCharacter(name);
      await interaction.editReply({
        embeds: [successEmbed('Character Removed', `**${character.name}** has been permanently removed from the market. User portfolios have been cleared of this character.`)],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
