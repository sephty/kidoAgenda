/**
 * Keep-Alive Service for Render
 * 
 * Pings the web server every 14 minutes to prevent Render free tier
 * from spinning down the service due to inactivity.
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

module.exports = { startKeepAlive };
