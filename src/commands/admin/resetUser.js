const { SlashCommandBuilder } = require('discord.js');
const { resetUser } = require('../../services/userService');
const { successEmbed } = require('../../utils/embeds');
const { requireAdmin } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reset-user')
    .setDescription("(Admin) Reset a user's balance and portfolio to defaults.")
    .addUserOption((o) =>
      o.setName('user').setDescription('Target user').setRequired(true)
    ),

  async execute(interaction) {
    try {
      requireAdmin(interaction);
      const target = interaction.options.getUser('user');
      const user = await resetUser(target.id);

      await interaction.reply({
        embeds: [
          successEmbed(
            'User Reset',
            `**${target.username}** has been reset.\nBalance: **${user.balance.toFixed(2)}** | Portfolio cleared.`
          ),
        ],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
