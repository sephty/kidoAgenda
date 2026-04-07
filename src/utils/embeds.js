const { EmbedBuilder } = require('discord.js');

// Color palette — no emojis, just clean color semantics
const Colors = {
  positive: 0x2ecc71,   // green
  negative: 0xe74c3c,   // red
  neutral: 0x5865f2,    // discord blurple (system/info)
  warning: 0xe67e22,    // orange
  profile: 0x9b59b6,    // purple (user profiles)
};

/**
 * Returns a small +/- indicator string based on a numeric change.
 */
function changeIndicator(change) {
  if (change > 0) return `+${change.toFixed(2)}%`;
  if (change < 0) return `${change.toFixed(2)}%`;
  return '0.00%';
}

/**
 * Character detail embed — shown by /character command.
 */
function characterEmbed(char) {
  const changeColor = char.lastChange >= 0 ? Colors.positive : Colors.negative;

  const embed = new EmbedBuilder()
    .setColor(changeColor)
    .setTitle(char.name)
    .setDescription(char.description || 'No description provided.')
    .addFields(
      { name: 'Price', value: `${char.price.toFixed(2)}`, inline: true },
      { name: 'Last Change', value: changeIndicator(char.lastChange), inline: true },
      { name: 'Base Price', value: `${char.basePrice.toFixed(2)}`, inline: true },
      { name: 'Volatility', value: `${char.volatility.toFixed(1)}`, inline: true },
      { name: 'Reputation', value: `${char.reputation}`, inline: true },
      { name: 'Supply', value: `${char.circulatingSupply} / ${char.totalSupply}`, inline: true }
    )
    .setFooter({ text: `Updated ${char.updatedAt.toLocaleString()}` });

  if (char.profilePicture) embed.setThumbnail(char.profilePicture);
  return embed;
}

/**
 * Market overview embed — shown by /market command.
 * @param {Character[]} characters - Array of top characters sorted by price.
 */
function marketEmbed(characters) {
  const embed = new EmbedBuilder()
    .setColor(Colors.neutral)
    .setTitle('Market Overview')
    .setDescription(`Showing top ${characters.length} characters by price.`);

  if (characters.length === 0) {
    embed.setDescription('No characters are currently listed on the market.');
    return embed;
  }

  const rows = characters.map((c, i) => {
    const change = changeIndicator(c.lastChange);
    return `**${i + 1}. ${c.name}** — ${c.price.toFixed(2)} (${change})`;
  });

  embed.addFields({ name: 'Characters', value: rows.join('\n') });
  embed.setFooter({ text: 'Use /character <name> for full details.' });

  return embed;
}

/**
 * Portfolio summary embed — shown by /portfolio command.
 * @param {User} user
 * @param {Array<{ character: Character, amount: number, avgBuy: number }>} positions
 */
function portfolioEmbed(user, positions) {
  const embed = new EmbedBuilder()
    .setColor(Colors.profile)
    .setTitle(`${user.username}'s Portfolio`)
    .addFields({ name: 'Cash Balance', value: user.balance.toFixed(2), inline: true });

  if (user.profilePicture) embed.setThumbnail(user.profilePicture);

  if (positions.length === 0) {
    embed.setDescription('No positions held. Use /buy to start investing.');
    return embed;
  }

  let totalValue = user.balance;
  const lines = positions.map((pos) => {
    const currentValue = pos.character.price * pos.amount;
    const costBasis = pos.avgBuy * pos.amount;
    const pnl = currentValue - costBasis;
    const pnlStr = pnl >= 0 ? `+${pnl.toFixed(2)}` : pnl.toFixed(2);
    totalValue += currentValue;

    return (
      `**${pos.character.name}** — ${pos.amount} shares\n` +
      `  Current: ${pos.character.price.toFixed(2)} | Avg Buy: ${pos.avgBuy.toFixed(2)} | P&L: ${pnlStr}`
    );
  });

  embed.setDescription(lines.join('\n\n'));
  embed.addFields({ name: 'Total Portfolio Value', value: totalValue.toFixed(2), inline: true });

  return embed;
}

/**
 * User profile embed — shown by /profile command.
 */
function profileEmbed(user, positions, totalPortfolioValue) {
  const embed = new EmbedBuilder()
    .setColor(Colors.profile)
    .setTitle(`${user.username}`)
    .addFields(
      { name: 'Cash Balance', value: user.balance.toFixed(2), inline: true },
      { name: 'Positions Held', value: `${positions.length}`, inline: true },
      { name: 'Total Net Worth', value: totalPortfolioValue.toFixed(2), inline: true }
    )
    .setFooter({ text: `Member since ${user.createdAt.toLocaleDateString()}` });

  if (user.profilePicture) embed.setThumbnail(user.profilePicture);

  return embed;
}

/**
 * Event result embed — shown after /event is applied.
 */
function eventEmbed(character, description, changePercent, oldPrice, newPrice) {
  const isPositive = newPrice >= oldPrice;
  const embed = new EmbedBuilder()
    .setColor(isPositive ? Colors.positive : Colors.negative)
    .setTitle(`Market Event: ${character.name}`)
    .setDescription(description)
    .addFields(
      { name: 'Previous Price', value: oldPrice.toFixed(2), inline: true },
      { name: 'New Price', value: newPrice.toFixed(2), inline: true },
      { name: 'Change', value: changeIndicator(changePercent), inline: true }
    )
    .setFooter({ text: new Date().toLocaleString() });

  if (character.profilePicture) embed.setThumbnail(character.profilePicture);

  return embed;
}

/**
 * Transaction confirmation embed — buy or sell.
 */
function transactionEmbed(type, character, amount, pricePerShare, totalCost, newBalance) {
  const isBuy = type === 'buy';
  const embed = new EmbedBuilder()
    .setColor(isBuy ? Colors.positive : Colors.negative)
    .setTitle(isBuy ? 'Purchase Confirmed' : 'Sale Confirmed')
    .addFields(
      { name: 'Character', value: character.name, inline: true },
      { name: 'Shares', value: `${amount}`, inline: true },
      { name: 'Price / Share', value: pricePerShare.toFixed(2), inline: true },
      { name: isBuy ? 'Total Spent' : 'Total Received', value: totalCost.toFixed(2), inline: true },
      { name: 'New Balance', value: newBalance.toFixed(2), inline: true }
    );

  if (character.profilePicture) embed.setThumbnail(character.profilePicture);

  return embed;
}

/**
 * Simple success embed — generic acknowledgement.
 */
function successEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(Colors.positive)
    .setTitle(title)
    .setDescription(description);
}

/**
 * Simple info embed — generic neutral message.
 */
function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(Colors.neutral)
    .setTitle(title)
    .setDescription(description);
}

module.exports = {
  Colors,
  changeIndicator,
  characterEmbed,
  marketEmbed,
  portfolioEmbed,
  profileEmbed,
  eventEmbed,
  transactionEmbed,
  successEmbed,
  infoEmbed,
};
