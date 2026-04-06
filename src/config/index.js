require('dotenv').config();

/**
 * Central configuration object.
 * All environment-dependent values live here; the rest of the app imports from config.
 */
const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
    adminRoleName: process.env.ADMIN_ROLE_NAME || 'StockAdmin',
  },

  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/stockbot',
  },

  economy: {
    startingBalance: parseFloat(process.env.STARTING_BALANCE) || 0,
    maxBalance: parseFloat(process.env.MAX_BALANCE) || 999999,
  },

  market: {
    minPrice: parseFloat(process.env.MIN_STOCK_PRICE) || 0.01,
    maxPrice: parseFloat(process.env.MAX_STOCK_PRICE) || 9999,
    // Increased impact factor so trades are noticeable
    // buyImpactFactor of 0.01 = 100 shares * 0.01 = 1% price rise
    buyImpactFactor: 0.01,
    sellImpactFactor: 0.01,
  },

  cooldowns: {
    // Cooldown in milliseconds per command name
    buy: 5_000,
    sell: 5_000,
    market: 3_000,
    portfolio: 3_000,
    profile: 3_000,
    balance: 3_000,
    character: 3_000,
  },
};

// Fail fast at startup if critical env vars are missing
const required = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID', 'MONGODB_URI'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[Config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = config;
