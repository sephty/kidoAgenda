const { SlashCommandBuilder } = require('discord.js');
const { setPrice } = require('../../services/marketService');
const { characterEmbed } = require('../../utils/embeds');
const { requireAdmin, validatePrice } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-price')
    .setDescription('(Admin) Manually override a character\'s price.')
    .addStringOption((o) =>
      o.setName('character').setDescription('Character name').setRequired(true)
    )
    .addNumberOption((o) =>
      o.setName('price').setDescription('New price').setRequired(true)
    ),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);
      await interaction.deferReply();
      
      const name = interaction.options.getString('character').trim();
      const price = validatePrice(interaction.options.getNumber('price'));
      const character = await setPrice(name, price);
      await interaction.editReply({ embeds: [characterEmbed(character)] });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
