/**
 * deploy-commands.js
 *
 * Run this script ONCE (or whenever you add/change commands) to register
 * slash commands with Discord.
 *
 *   node deploy-commands.js
 *
 * Uses guild-scoped deployment so changes are instant (vs. global which can
 * take up to 1 hour to propagate).
 */

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('[Deploy] Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env');
  process.exit(1);
}

// ─── Collect all command definitions ──────────────────────────────────────────
const commands = [];
const commandDirs = ['admin', 'user'];

for (const dir of commandDirs) {
  const dirPath = path.join(__dirname, 'src', 'commands', dir);
  if (!fs.existsSync(dirPath)) continue;

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(dirPath, file));
    if (command.data) {
      commands.push(command.data.toJSON());
      console.log(`[Deploy] Queued: /${command.data.name}`);
    }
  }
}

// ─── Register with Discord API ─────────────────────────────────────────────────
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log(`\n[Deploy] Registering ${commands.length} slash command(s) to guild ${GUILD_ID}...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log(`[Deploy] Successfully registered ${data.length} command(s).`);
  } catch (err) {
    console.error('[Deploy] Failed to register commands:', err);
    process.exit(1);
  }
})();
