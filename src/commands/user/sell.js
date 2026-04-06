const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateUser, sellShares } = require('../../services/userService');
const { getCharacter } = require('../../services/marketService');
const { transactionEmbed } = require('../../utils/embeds');
const { validatePositiveInt } = require('../../utils/validation');
const { useCooldown } = require('../../utils/cooldown');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell shares of a character.')
    .addStringOption((o) =>
      o.setName('character').setDescription('Character name').setRequired(true)
    )
    .addIntegerOption((o) =>
      o
        .setName('amount')
        .setDescription('Number of shares to sell')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
      useCooldown('sell', interaction.user.id);

      const characterName = interaction.options.getString('character').trim();
      const amount = validatePositiveInt(interaction.options.getInteger('amount'));

      await interaction.deferReply();

      const user = await getOrCreateUser(interaction.member);
      const character = await getCharacter(characterName);

      const { totalReceived, pricePerShare } = await sellShares(user, character, amount);

      await interaction.editReply({
        embeds: [
          transactionEmbed('sell', character, amount, pricePerShare, totalReceived, user.balance),
        ],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
