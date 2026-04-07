const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const { successEmbed } = require('../../utils/embeds');
const { requireAdmin, validateNonNegativeFloat } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');
const { Errors } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-balance')
    .setDescription('(Admin) Set a user\'s balance to a specific amount and clear portfolio.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Target user').setRequired(true)
    )
    .addNumberOption((o) =>
      o.setName('balance').setDescription('New balance amount').setRequired(true).setMinValue(0)
    ),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);
      await interaction.deferReply();

      const target = interaction.options.getUser('user');
      const amount = validateNonNegativeFloat(interaction.options.getNumber('balance'));

      const user = await User.findOne({ discordId: target.id });
      if (!user) throw Errors.notFound(`User "${target.username}"`);

      // Set balance explicitly and clear portfolio entirely
      user.balance = amount;
      user.portfolio = [];
      user.totalValue = 0;
      await user.save();

      await interaction.editReply({
        embeds: [
          successEmbed(
            'Balance Reset',
            `**${target.username}** balance set to **${amount.toFixed(2)}** kidobux.\nPortfolio cleared.`
          ),
        ],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
