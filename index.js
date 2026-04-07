/**
 * Root entry point for hosting servers.
 * Includes a keep-alive web server for Render + Discord bot.
 */

const express = require('express');
const http = require('http');
const { startKeepAlive } = require('./keep_alive');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Stock Bot is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`[WebServer] Running on port ${PORT}`);
});

// Start keep-alive service
startKeepAlive(PORT);

// Start Discord bot
require('./src/index.js');
