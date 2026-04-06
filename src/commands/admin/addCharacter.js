const { SlashCommandBuilder } = require('discord.js');
const { createCharacter } = require('../../services/characterService');
const { characterEmbed, successEmbed } = require('../../utils/embeds');
const { requireAdmin, validateCharacterName, validatePrice, validateVolatility, validateUrl, validatePositiveInt } = require('../../utils/validation');
const { replyWithError } = require('../../utils/errors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-character')
    .setDescription('(Admin) Add a new character to the stock market.')
    .addStringOption((o) =>
      o.setName('name').setDescription('Character name (unique)').setRequired(true)
    )
    .addNumberOption((o) =>
      o.setName('price').setDescription('Starting price').setRequired(true)
    )
    .addStringOption((o) =>
      o.setName('description').setDescription('Short RP description').setRequired(false)
    )
    .addAttachmentOption((o) =>
      o.setName('picture').setDescription('Profile picture (upload image file)').setRequired(false)
    )
    .addNumberOption((o) =>
      o.setName('volatility')
        .setDescription('Price swing multiplier (0.1 – 5.0, default 1.0)')
        .setRequired(false)
    )
    .addIntegerOption((o) =>
      o.setName('supply')
        .setDescription('Total share supply (default 1000)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await requireAdmin(interaction);
      
      // Defer since we're making a database write
      await interaction.deferReply();

      const name = validateCharacterName(interaction.options.getString('name'));
      const price = validatePrice(interaction.options.getNumber('price'));
      const description = interaction.options.getString('description') ?? '';
      
      // Get profile picture from attachment
      const attachment = interaction.options.getAttachment('picture');
      const profilePicture = attachment?.url || null;
      
      const volatility = interaction.options.getNumber('volatility')
        ? validateVolatility(interaction.options.getNumber('volatility'))
        : 1.0;
      const totalSupply = interaction.options.getInteger('supply') ?? 1000;

      if (totalSupply < 1 || totalSupply > 1_000_000) {
        return await interaction.editReply({ content: '**Error:** Supply must be between 1 and 1,000,000.' });
      }

      const character = await createCharacter({
        name,
        description,
        profilePicture,
        price,
        volatility,
        totalSupply,
      });

      await interaction.editReply({ embeds: [characterEmbed(character)] });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
