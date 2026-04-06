const { Events } = require('discord.js');

/**
 * Fired once when the Discord client successfully connects and is ready.
 */
module.exports = {
  name: Events.ClientReady,
  once: true,

  execute(client) {
    console.log(`[Ready] Logged in as ${client.user.tag}`);
    console.log(`[Ready] Serving ${client.guilds.cache.size} guild(s).`);
    client.user.setActivity('the stock market', { type: 3 }); // WATCHING
  },
};
