const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateUser, buyShares } = require('../../services/userService');
const { getCharacter } = require('../../services/marketService');
const { transactionEmbed } = require('../../utils/embeds');
const { validatePositiveInt } = require('../../utils/validation');
const { useCooldown } = require('../../utils/cooldown');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy shares of a character.')
    .addStringOption((o) =>
      o.setName('character').setDescription('Character name').setRequired(true)
    )
    .addIntegerOption((o) =>
      o
        .setName('amount')
        .setDescription('Number of shares to buy')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
      useCooldown('buy', interaction.user.id);

      const characterName = interaction.options.getString('character').trim();
      const amount = validatePositiveInt(interaction.options.getInteger('amount'));

      // Defer since we're making multiple DB writes
      await interaction.deferReply();

      const user = await getOrCreateUser(interaction.member);
      const character = await getCharacter(characterName);

      const { totalCost, pricePerShare } = await buyShares(user, character, amount);

      await interaction.editReply({
        embeds: [
          transactionEmbed('buy', character, amount, pricePerShare, totalCost, user.balance),
        ],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
