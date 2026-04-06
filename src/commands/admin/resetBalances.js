const { SlashCommandBuilder } = require('discord.js');
const { requireAdmin } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');
const User = require('../../models/User');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-balances')
    .setDescription('(Admin) Reset all users\' balance to 0 hullbux and clear portfolios.'),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);

      await interaction.deferReply();

      const result = await User.updateMany(
        {},
        { 
          balance: 0,
          portfolio: [],
          totalValue: 0
        }
      );

      const message = `✅ **Reset Complete**\nUpdated ${result.modifiedCount} user(s) to 0 hullbux with cleared portfolios.`;
      await interaction.editReply({ content: message });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
