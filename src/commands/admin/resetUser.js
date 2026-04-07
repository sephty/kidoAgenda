const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const config = require('../../config');
const { successEmbed } = require('../../utils/embeds');
const { requireAdmin } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');
const { Errors } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-user')
    .setDescription("(Admin) Reset a user's balance and portfolio to starting defaults.")
    .addUserOption((o) =>
      o.setName('user').setDescription('Target user').setRequired(true)
    ),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);
      await interaction.deferReply();
      
      const target = interaction.options.getUser('user');
      
      // Find user and reset everything
      const user = await User.findOne({ discordId: target.id });
      if (!user) throw Errors.notFound(`User "${target.username}"`);

      // Explicitly clear all data
      user.balance = config.economy.startingBalance;
      user.portfolio = [];
      user.totalValue = 0;
      await user.save();

      await interaction.editReply({
        embeds: [
          successEmbed(
            'User Reset',
            `**${target.username}** has been reset.\nBalance: **${user.balance.toFixed(2)}** kidobux | Portfolio cleared.`
          ),
        ],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
