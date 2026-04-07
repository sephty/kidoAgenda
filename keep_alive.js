/**
 * Keep-Alive & Web Server Service
 * 
 * Handles:
 * - Express web server for Render + UptimeRobot monitoring
 * - Automatic self-pinging to prevent spin-down
 */

const express = require('express');
const http = require('http');

let botReady = false;

/**
 * Start the web server and keep-alive service
 */
function startServer(port = 3000) {
  const app = express();
  const START_TIME = Date.now();

  // Middleware
  app.use(express.json());

  // ─── Monitoring Endpoints ────────────────────────────────────
  app.get('/', (req, res) => {
    res.status(200).send('Stock Bot is running!');
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'alive',
      bot: botReady ? 'ready' : 'starting',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - START_TIME) / 1000)
    });
  });

  app.get('/ping', (req, res) => {
    res.status(200).json({
      message: 'pong',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/status', (req, res) => {
    res.status(200).json({
      service: 'Stock Bot',
      status: 'online',
      botReady: botReady,
      uptime: Math.floor((Date.now() - START_TIME) / 1000),
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  // Start server
  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`[WebServer] Running on http://localhost:${port}`);
    console.log(`[WebServer] UptimeRobot can ping: /health, /ping, or /status`);
  });

  // Start self-pinging to prevent Render spin-down
  startKeepAlive(port);

  return server;
}

/**
 * Keep-Alive: Ping self every 14 minutes
 */
function startKeepAlive(port = 3000) {
  const INTERVAL = 14 * 60 * 1000; // 14 minutes
  
  setInterval(async () => {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        console.log(`[KeepAlive] Ping successful at ${new Date().toISOString()}`);
      }
    } catch (err) {
      console.error(`[KeepAlive] Ping failed:`, err.message);
    }
  }, INTERVAL);
  
  console.log('[KeepAlive] Initialized (pings every 14 minutes)');
}

/**
 * Set bot ready status (called from Discord bot when ready)
 */
function setBotReady(isReady) {
  botReady = isReady;
  console.log(`[KeepAlive] Bot ready status: ${isReady}`);
}

module.exports = { startServer, setBotReady };
