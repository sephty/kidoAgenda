const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateUser, sellShares } = require('../../services/userService');
const { getCharacter } = require('../../services/marketService');
const { transactionEmbed } = require('../../utils/embeds');
const { validatePositiveInt } = require('../../utils/validation');
const { checkCooldown, setCooldown } = require('../../utils/cooldown');
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
      // Check cooldown BEFORE deferring (fail fast)
      const { onCooldown, remainingSeconds } = checkCooldown('sell', interaction.user.id);
      if (onCooldown) {
        const { Errors } = require('../../utils/errors');
        throw Errors.cooldown(remainingSeconds);
      }

      const characterName = interaction.options.getString('character').trim();
      const amount = validatePositiveInt(interaction.options.getInteger('amount'));

      await interaction.deferReply();

      const user = await getOrCreateUser(interaction);
      const character = await getCharacter(characterName);

      const { totalReceived, pricePerShare } = await sellShares(user, character, amount);

      // Set cooldown AFTER successful transaction
      setCooldown('sell', interaction.user.id);

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
