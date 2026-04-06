const { SlashCommandBuilder } = require('discord.js');
const { removeBalance } = require('../../services/userService');
const { successEmbed } = require('../../utils/embeds');
const { requireAdmin, validatePositiveFloat } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-balance')
    .setDescription('(Admin) Remove currency from a user\'s balance.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Target user').setRequired(true)
    )
    .addNumberOption((o) =>
      o.setName('amount').setDescription('Amount to remove').setRequired(true)
    ),

  async execute(interaction) {
    try {
      requireAdmin(interaction);
      const target = interaction.options.getUser('user');
      const amount = validatePositiveFloat(interaction.options.getNumber('amount'));

      const user = await removeBalance(target.id, amount);

      await interaction.reply({
        embeds: [
          successEmbed(
            'Balance Removed',
            `Removed **${amount.toFixed(2)}** from ${target.username}.\nNew balance: **${user.balance.toFixed(2)}**`
          ),
        ],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
