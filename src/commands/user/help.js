const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View the complete guide for the Stock Market Bot.'),

  async execute(interaction) {
    const embeds = [
      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📚 Stock Market Bot - Complete Guide')
        .setDescription('Welcome to the Kido Agenda Stock Market! Here\'s everything you need to know.')
        .addFields(
          {
            name: '💰 Getting Started',
            value: 'You start with **0 hullbux**. Earn money by trading stocks strategically and participating in events!',
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📊 Trading Commands')
        .addFields(
          {
            name: '/balance',
            value: 'Check your current **hullbux** balance and purchasing power.',
            inline: false,
          },
          {
            name: '/market [limit]',
            value: 'View all available character stocks. Optional: set limit (1-25, default 10).',
            inline: false,
          },
          {
            name: '/character <name>',
            value: 'Get detailed info about a specific character stock including price history and volatility.',
            inline: false,
          },
          {
            name: '/buy <character> <amount>',
            value: 'Purchase shares of a character. Example: `/buy Naruto 10`',
            inline: false,
          },
          {
            name: '/sell <character> <amount>',
            value: 'Sell your shares to get hullbux back. You\'ll earn profit/loss based on buy vs current price.',
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎯 Portfolio Commands')
        .addFields(
          {
            name: '/portfolio',
            value: 'See all your current stock holdings with average buy price and current value.',
            inline: false,
          },
          {
            name: '/profile',
            value: 'View your complete investor profile including net worth and top holdings.',
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⚡ How Trading Works')
        .addFields(
          {
            name: 'Price Movements',
            value: 'When you **buy** shares, the stock price goes **UP**. When you **sell**, it goes **DOWN**. This simulates market supply and demand!',
            inline: false,
          },
          {
            name: 'Profit & Loss',
            value: 'Your profit/loss is calculated based on your **average buy price** vs the **current selling price**. The average adjusts when you buy more of the same stock.',
            inline: false,
          },
          {
            name: 'Volatility',
            value: 'Some stocks are more volatile (prices swing wildly) while others are stable. Check each stock\'s details with `/character`!',
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎁 Special Features')
        .addFields(
          {
            name: 'Events',
            value: 'Admins can trigger special market events that affect stock prices across the board.',
            inline: false,
          },
          {
            name: 'Cooldowns',
            value: 'Each command has a cooldown. Buy/Sell: 5s | Market info: 3s',
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('💡 Pro Tips')
        .addFields(
          {
            name: 'Strategy Ideas',
            value: '• Buy low, sell high - watch for price dips\n• Diversify your portfolio across multiple stocks\n• Monitor volatile stocks for big gains (and losses!)\n• Don\'t panic sell - hold long term positions\n• Track price trends with `/character`',
            inline: false,
          }
        ),

      new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('❓ Questions?')
        .setDescription('Use `/help` anytime to see this guide again. Good luck! 🚀'),
    ];

    await interaction.reply({ embeds });
  },
};
