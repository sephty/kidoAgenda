const { SlashCommandBuilder } = require('discord.js');
const User = require('../../models/User');
const { getOrCreateUser } = require('../../services/userService');
const { infoEmbed } = require('../../utils/embeds');
const { useCooldown } = require('../../utils/cooldown');
const { replyWithError } = require('../../utils/errors');
const { Errors } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance or another user\'s balance.')
    .addUserOption((o) =>
      o.setName('user').setDescription('Target user (leave empty for yourself)').setRequired(false)
    ),

  async execute(interaction) {
    try {
      useCooldown('balance', interaction.user.id);

      const targetUser = interaction.options.getUser('user');
      
      let user;
      let targetDiscordId;
      let targetUsername;
      let targetAvatar;

      if (targetUser) {
        // Check another user's balance
        targetDiscordId = targetUser.id;
        targetUsername = targetUser.username;
        targetAvatar = targetUser.displayAvatarURL({ size: 256 });
        
        user = await User.findOne({ discordId: targetDiscordId });
        if (!user) throw Errors.notFound(`User "${targetUsername}"`);
      } else {
        // Check own balance
        user = await getOrCreateUser(interaction);
        targetDiscordId = interaction.user.id;
        targetUsername = interaction.user.username;
        targetAvatar = interaction.user.displayAvatarURL({ size: 256 });
      }

      const embed = infoEmbed(`${targetUsername}'s Balance`, `**${user.balance.toFixed(2)}** kidobux`)
        .setThumbnail(targetAvatar)
        .setFooter({ text: targetUsername });

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
