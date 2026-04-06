const { SlashCommandBuilder } = require('discord.js');
const { addBalance } = require('../../services/userService');
const { successEmbed } = require('../../utils/embeds');
const { requireAdmin, validatePositiveFloat } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-balance')
    .setDescription('(Admin) Add currency to a user\'s balance.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Target user').setRequired(true)
    )
    .addNumberOption((o) =>
      o.setName('amount').setDescription('Amount to add').setRequired(true)
    ),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);
      await interaction.deferReply();
      
      const target = interaction.options.getUser('user');
      const amount = validatePositiveFloat(interaction.options.getNumber('amount'));

      const user = await addBalance(target.id, amount);

      await interaction.editReply({
        embeds: [
          successEmbed(
            'Balance Added',
            `Added **${amount.toFixed(2)}** to ${target.username}.\nNew balance: **${user.balance.toFixed(2)}**`
          ),
        ],
      });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
