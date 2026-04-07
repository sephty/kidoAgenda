/**
 * Root entry point for hosting servers.
 * Delegates to keep_alive for web server, then starts Discord bot.
 */

const { startServer, setBotReady } = require('./keep_alive');
const PORT = process.env.PORT || 3000;

// Start web server + keep-alive
startServer(PORT);

// Start Discord bot
const bot = require('./src/index.js');

// Update ready status when bot connects
if (bot && bot.on) {
  bot.on('ready', () => setBotReady(true));
}
