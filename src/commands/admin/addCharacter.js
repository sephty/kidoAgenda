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
    .addStringOption((o) =>
      o.setName('picture').setDescription('Profile picture URL').setRequired(false)
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
      requireAdmin(interaction);

      const name = validateCharacterName(interaction.options.getString('name'));
      const price = validatePrice(interaction.options.getNumber('price'));
      const description = interaction.options.getString('description') ?? '';
      const pictureRaw = interaction.options.getString('picture');
      const profilePicture = validateUrl(pictureRaw);
      const volatility = interaction.options.getNumber('volatility')
        ? validateVolatility(interaction.options.getNumber('volatility'))
        : 1.0;
      const totalSupply = interaction.options.getInteger('supply') ?? 1000;

      if (totalSupply < 1 || totalSupply > 1_000_000) {
        return interaction.reply({ content: '**Error:** Supply must be between 1 and 1,000,000.', ephemeral: true });
      }

      const character = await createCharacter({
        name,
        description,
        profilePicture,
        price,
        volatility,
        totalSupply,
      });

      await interaction.reply({ embeds: [characterEmbed(character)] });
    } catch (err) {
      await replyWithError(interaction, err);
    }
  },
};
