const { SlashCommandBuilder } = require('discord.js');
const { applyEvent, EVENT_TYPES } = require('../../services/marketService');
const { eventEmbed } = require('../../utils/embeds');
const { requireAdmin } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

// Build choice list from EVENT_TYPES for the slash command
const eventChoices = Object.entries(EVENT_TYPES).map(([key, val]) => ({
  name: val.label,
  value: key,
}));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('(Admin) Apply a market event to a character.')
    .addStringOption((o) =>
      o.setName('character').setDescription('Character name').setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName('type')
        .setDescription('Type of event')
        .setRequired(true)
        .addChoices(...eventChoices)
    )
    .addNumberOption((o) =>
      o
        .setName('custom_impact')
        .setDescription('Custom % impact (only used with "Custom Event" type, can be negative)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);
      await interaction.deferReply(); // Event processing may take a moment

      const characterName = interaction.options.getString('character').trim();
      const eventType = interaction.options.getString('type');
      const customImpact = interaction.options.getNumber('custom_impact') ?? null;

      // Validate custom impact range
      if (eventType === 'custom' && customImpact === null) {
        return interaction.editReply({
          content: '**Error:** Custom event type requires a `custom_impact` value.',
        });
      }

      if (customImpact !== null && (customImpact < -100 || customImpact > 200)) {
        return interaction.editReply({
          content: '**Error:** Custom impact must be between -100 and 200.',
        });
      }

      const result = await applyEvent(characterName, eventType, customImpact);

      await interaction.editReply({
        embeds: [
          eventEmbed(
            result.character,
            result.eventLabel,
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
