/**
 * Entry point — bootstraps the Discord client, database, commands, and event handlers.
 */

// Force Node.js to use reliable public DNS servers for MongoDB Atlas resolution
const dns = require('node:dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const config = require('./config');

mongoose.set('strictQuery', true);

// ─── Discord Client ────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required for basic guild functionality
    GatewayIntentBits.GuildMembers,     // IMPORTANT: Required for member.roles to populate
    GatewayIntentBits.DirectMessages,   // For DM support
    GatewayIntentBits.MessageContent,   // Privileged: for message content
  ],
});

// Attach a commands Map to the client so event handlers can access it
client.commands = new Collection();

// Prevent memory leaks from too many listeners
// Default is 10, increase to 15 since we have many event listeners
client.setMaxListeners(15);

client.on('error', (error) => console.error('[DiscordClient] Error', error));
client.on('shardError', (error) => console.error('[DiscordClient] Shard Error', error));
client.on('warn', (warning) => console.warn('[DiscordClient] Warning', warning));

// ─── Load Commands ─────────────────────────────────────────────────────────────
function loadCommands() {
  const commandDirs = ['admin', 'user'];
  let loaded = 0;

  for (const dir of commandDirs) {
    const dirPath = path.join(__dirname, 'commands', dir);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.js'));

    for (const file of files) {
      const command = require(path.join(dirPath, file));

      if (!command.data || !command.execute) {
        console.warn(`[Commands] Skipping ${file} — missing data or execute.`);
        continue;
      }

      client.commands.set(command.data.name, command);
      loaded++;
    }
  }

  console.log(`[Commands] Loaded ${loaded} command(s).`);
}

// ─── Load Events ───────────────────────────────────────────────────────────────
function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  if (!fs.existsSync(eventsPath)) return;

  const files = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.js'));
  let loaded = 0;

  for (const file of files) {
    const event = require(path.join(eventsPath, file));

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }

    loaded++;
  }

  console.log(`[Events] Registered ${loaded} event(s).`);
}

// ─── Scheduler State ──────────────────────────────────────────────────────────
const schedulers = {
  passiveDrift: null,
};

// ─── Passive Drift Scheduler ───────────────────────────────────────────────────
function startPassiveDrift() {
  const { applyPassiveDrift } = require('./services/marketService');
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Run once shortly after startup, then every 24h
  const startupTimeout = setTimeout(async () => {
    try {
      await applyPassiveDrift();
    } catch (e) {
      console.error('[PassiveDrift] Error during drift tick:', e);
    }

    schedulers.passiveDrift = setInterval(async () => {
      try {
        await applyPassiveDrift();
      } catch (e) {
        console.error('[PassiveDrift] Error during drift tick:', e);
      }
    }, INTERVAL_MS);
    
    if (schedulers.passiveDrift) {
      schedulers.passiveDrift.unref(); // Allow process to exit if only this interval is running
    }
  }, 60_000); // Wait 1 minute after startup before first tick
  
  startupTimeout.unref(); // Allow process to exit if only this timeout is running

  console.log('[PassiveDrift] Scheduler initialized (first tick in 60s, then every 24h).');
}

// ─── Database Connection ───────────────────────────────────────────────────────
async function connectDatabase() {
  try {
    console.log('[Database] Attempting connection to:', config.db.uri.replace(/:[^:@]*@/, ':****@')); // Log with masked password
    await mongoose.connect(config.db.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      serverSelectionTimeoutMS: 10_000,
      // Connection pooling settings to prevent resource exhaustion
      maxPoolSize: 10,        // Max connections in the pool
      minPoolSize: 2,         // Min connections to keep alive
      maxIdleTimeMS: 45000,   // Close connections idle > 45s
      waitQueueTimeoutMS: 5000, // Timeout if queue waits > 5s
    });
    console.log('[Database] Connected to MongoDB with connection pooling.');
  } catch (err) {
    console.error('[Database] Failed to connect:', err.message);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────
function setupShutdownHandlers() {
  const shutdown = async (signal) => {
    console.log(`\n[Shutdown] Received ${signal}. Closing gracefully...`);
    
    // Stop all schedulers
    if (schedulers.passiveDrift) {
      clearInterval(schedulers.passiveDrift);
      console.log('[Shutdown] Stopped passive drift scheduler.');
    }
    
    // Stop cooldown cleanup
    const { stopCleanupInterval } = require('./utils/cooldown');
    stopCleanupInterval();
    
    // Stop Discord client
    client.destroy();
    console.log('[Shutdown] Closed Discord client.');
    
    // Disconnect database
    await mongoose.disconnect();
    console.log('[Shutdown] Disconnected from MongoDB.');
    
    console.log('[Shutdown] Cleanup complete. Exiting.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Log unhandled promise rejections rather than letting them crash silently
  process.on('unhandledRejection', (reason) => {
    console.error('[UnhandledRejection]', reason);
  });
}

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  console.log('[Boot] Starting Discord Stock Bot...');

  setupShutdownHandlers();
  await connectDatabase();
  
  // Start cooldown cleanup interval to prevent memory leaks
  const { startCleanupInterval } = require('./utils/cooldown');
  startCleanupInterval();

  loadCommands();
  loadEvents();

  await client.login(config.discord.token);

  startPassiveDrift();
}

bootstrap().catch((err) => {
  console.error('[Boot] Fatal error during startup:', err);
  process.exit(1);
});
