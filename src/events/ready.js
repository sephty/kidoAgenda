const { Events } = require('discord.js');
const { randomizeVolatility } = require('../services/marketService');

/**
 * Fired once when the Discord client successfully connects and is ready.
 */
module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);
    console.log(`[Ready] Serving ${client.guilds.cache.size} guild(s).`);
    
    // Try to fetch the configured guild to ensure it's cached
    const { guildId } = require('../config').discord;
    if (guildId) {
      try {
        const guild = await client.guilds.fetch(guildId);
        console.log(`[Ready] Fetched configured guild: ${guild.name} (${guild.id})`);
      } catch (err) {
        console.warn(`[Ready] Failed to fetch guild ${guildId}: ${err.message}`);
      }
    }
    
    client.user.setActivity('the stock market', { type: 3 }); // WATCHING

    // Schedule volatility randomization every 10 minutes
    // This simulates real market conditions where volatility fluctuates
    setInterval(async () => {
      try {
        await randomizeVolatility();
      } catch (err) {
        console.error('[Ready] Error randomizing volatility:', err.message);
      }
    }, 10 * 60 * 1000); // 10 minutes

    console.log('[Ready] Volatility randomization scheduled (every 10 minutes)');
  },
};
