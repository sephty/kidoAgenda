const { SlashCommandBuilder } = require('discord.js');
const { getOrCreateUser } = require('../../services/userService');
const { infoEmbed } = require('../../utils/embeds');
const { useCooldown } = require('../../utils/cooldown');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your current currency balance.'),

  async execute(interaction) {
    try {
      useCooldown('balance', interaction.user.id);

      const user = await getOrCreateUser(interaction.member);

      const embed = infoEmbed('Your Balance', `**${user.balance.toFixed(2)}** credits`)
        .setThumbnail(interaction.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `${interaction.user.username}` });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
