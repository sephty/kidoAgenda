const { SlashCommandBuilder } = require('discord.js');
const { applyEvent } = require('../../services/marketService');
const { eventEmbed } = require('../../utils/embeds');
const { requireAdmin } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('(Admin) Apply a custom market event to a character.')
    .addStringOption((o) =>
      o.setName('character').setDescription('Character name').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('description').setDescription('Event description (e.g., "Victory in tournament")').setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName('direction')
        .setDescription('Price direction')
        .setRequired(true)
        .addChoices(
          { name: 'Up', value: 'up' },
          { name: 'Down', value: 'down' }
        )
    )
    .addNumberOption((o) =>
      o
        .setName('amount')
        .setDescription('Impact percentage (0-200%)')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(200)
    ),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);
      await interaction.deferReply();

      const characterName = interaction.options.getString('character').trim();
      const description = interaction.options.getString('description').trim();
      const direction = interaction.options.getString('direction');
      const amount = interaction.options.getNumber('amount');

      const result = await applyEvent(characterName, description, direction, amount);

      await interaction.editReply({
        embeds: [
          eventEmbed(
            result.character,
            description,
            result.changePercent,
            result.oldPrice,
            result.newPrice
          ),
        ],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
