# Stock Bot - Setup & Integration Guide

## 🔧 What Was Fixed

### Critical Issues (Phase 1)
- ✅ **Race conditions in buy/sell** — Now uses atomic Mongoose transactions
- ✅ **Cooldown exploitation** — Cooldown only applies after successful transaction
- ✅ **Missing integer validation** — All numeric inputs strictly validated
- ✅ **Admin role check crashes** — Handles null members and case-insensitive matching
- ✅ **Passive drift timeouts** — Batch processing prevents DB timeouts on large character sets

### Medium Priority (Phase 2)
- ✅ **Market impact factor too small** — Increased from 0.001 to 0.01 for noticeable trades
- ✅ **No audit logging** — All transactions now logged to `Transaction` collection
- ✅ **Admin operations untracked** — Balance add/remove operations now audited

### Architecture Improvements
- ✅ **Mongoose strictQuery** — Better error handling for schema validation
- ✅ **Connection pooling** — Improved MongoDB connection settings
- ✅ **Better error messages** — Reduced information disclosure in error replies

---

## 🚀 Getting Started

### Step 1: Install Dependencies

```bash
cd c:\Users\garci\Downloads\discord-stock-bot\kidoAgenda
npm install
```

**Note:** `package.json` now includes `mongoose` and `dotenv` as explicit dependencies.

### Step 2: Set Up MongoDB Atlas

#### Create Cluster
1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Click **Create Deployment** → **Free (M0)**
4. Choose region (closest to your server)
5. Click **Create**

#### Create Database User
1. In Atlas dashboard: **Security > Database Access**
2. Click **+ Add New Database User**
3. Set username: `bot_user`
4. Generate secure password (copy it)
5. Click **Add User**

#### Whitelist Your IP
1. Go to **Security > Network Access**
2. Click **+ Add IP Address**
3. Choose **Allow Access from Anywhere** (or add your IP)
4. Confirm

#### Get Connection String
1. Go to **Deployments > Clusters**
2. Click **Connect** on your cluster
3. Choose **Drivers** (not Compass)
4. Copy the connection string
5. Replace placeholders:
   - `<username>` → `bot_user`
   - `<password>` → Your database user password
   - `<database>` → `stockbot` (or any name)

### Step 3: Configure Environment

Open your `.env` file (in project root):

```dotenv
DISCORD_TOKEN=your_actual_bot_token
CLIENT_ID=your_client_id_from_discord_portal
GUILD_ID=your_server_id
MONGODB_URI=mongodb+srv://bot_user:YourPassword@cluster0.xyz.mongodb.net/stockbot?retryWrites=true&w=majority
ADMIN_ROLE_NAME=StockAdmin
STARTING_BALANCE=100
MAX_BALANCE=999999
```

### Step 4: Deploy Commands

This registers all slash commands with Discord (instant for guild-scoped):

```bash
npm run deploy
```

**Expected output:**
```
[Deploy] Registering 15 slash command(s) to guild 123456789...
[Deploy] Successfully registered 15 command(s).
```

### Step 5: Start the Bot

```bash
npm start
```

**Expected output:**
```
[Boot] Starting Discord Stock Bot...
[Database] Connected to MongoDB.
[Commands] Loaded 15 command(s).
[Events] Registered 2 event(s).
[PassiveDrift] Scheduler initialized (first tick in 60s, then every 24h).
[Ready] Logged in as KidoWayOfTheAgenda#1234
[Ready] Serving 1 guild(s).
```

---

## 🛠️ Integrating into Your Existing Bot

### Option A: Copy Files Into Existing Bot

```bash
# From your bot directory:
cp -r c:\Users\garci\Downloads\discord-stock-bot\kidoAgenda\src\services .
cp -r c:\Users\garci\Downloads\discord-stock-bot\kidoAgenda\src\models .
cp -r c:\Users\garci\Downloads\discord-stock-bot\kidoAgenda\src\commands .
cp -r c:\Users\garci\Downloads\discord-stock-bot\kidoAgenda\src\utils .
```

Then in your bot's main `index.js`, add after your existing command loader:

```javascript
// Stock market commands
const commandDirs = ['admin', 'user'];
for (const dir of commandDirs) {
  const dirPath = path.join(__dirname, 'commands', dir);
  if (!fs.existsSync(dirPath)) continue;

  const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.js'));
  for (const file of files) {
    const command = require(path.join(dirPath, file));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  }
}
```

Then add these models to your mongoose connection:

```javascript
require('./models/User');
require('./models/Character');
require('./models/Transaction');
```

### Option B: Keep as Standalone

Run this bot as a separate process on your server, and users interact with it via slash commands in the same Discord server.

---

## 🧪 Testing the Fixes

### Test 1: Concurrent Buy Protection

```bash
# Start bot, then in Discord as two different users:

# User A:
/buy character:"TestChar" amount:100

# User B (simultaneously):
/buy character:"TestChar" amount:100

# Expected: One succeeds, one fails with "Market is out of stock"
# Before fix: Both could succeed (supply checked at stale state)
```

### Test 2: Cooldown Only After Success

```bash
# /buy character:"DoesNotExist" amount:10
# → Error: Character not found
# → Try again immediately (should work)
# After fix: Cooldown not set if transaction fails ✓

# /buy character:"ValidChar" amount:10
# → Success
# → Try again immediately
# → Error: On cooldown (5 seconds left)
# After fix: Cooldown set only after success ✓
```

### Test 3: Audit Logging

```bash
# In MongoDB Compass, check the `transactions` collection:
# - Each buy/sell appears as a record
# - Admin balance changes are logged as ADMIN_ADD/ADMIN_REMOVE
# - Useful for fairness audits and dispute resolution
```

---

## 📊 Audit Commands

Check transaction history (for admins/debugging):

```javascript
// In a quick script or Discord bot admin command:
const Transaction = require('./models/Transaction');

// All buys/sells by user:
const userTxns = await Transaction.find({ userId: '12345' }).sort({ createdAt: -1 });

// All transactions for a character:
const charTxns = await Transaction.find({ characterId: charId }).sort({ createdAt: -1 });

// Detect unusual activity:
const largeTrades = await Transaction.find({
  totalValue: { $gt: 50000 }
}).sort({ createdAt: -1 });
```

---

## 🔒 Security Checklist

- [ ] Bot token is in `.env` (never committed to git)
- [ ] `.gitignore` includes `.env`
- [ ] MongoDB user password is strong (20+ chars, special chars)
- [ ] IP whitelist is set in MongoDB Atlas (or "Anywhere" if testing)
- [ ] Admin role name in `.env` matches your Discord role exactly
- [ ] Bot has correct intents (Guilds, GuildMembers)
- [ ] Slash commands use `ephemeral: true` for private data

---

## 📈 Scaling Notes

### For 10k+ Users
- Consider Redis caching layer for market data (see optional improvements)
- Move passive drift to a dedicated job queue (Bull, BullMQ)
- Use MongoDB sharding for character/transaction collections

### Single Server Deployment
- This setup works great for 1-5 servers
- Mongoose connections auto-pool (limit: 50 by default)
- In-memory cooldowns reset on bot restart (acceptable for RP)

### Multi-Server Support
- Change `deploy-commands.js` to use `Routes.applicationCommands(CLIENT_ID)` for global deployment
- Add guild-specific config if needed
- Audit logging helps with fairness across guilds

---

## 📝 Configuration Tuning

### Make the Market More Active

```dotenv
# Increase starting balance so people buy more
STARTING_BALANCE=500

# Decrease max price so transactions are larger
MAX_STOCK_PRICE=100

# Increase impact factor so trades move price more
# (modify in src/config/index.js, not .env)
# buyImpactFactor: 0.05  # 5% per share = very responsive
```

### Make the Market More Stable

```dotenv
STARTING_BALANCE=50

# In src/config/index.js:
# buyImpactFactor: 0.001  # 0.1% per share = slow-moving
# Decrease event volatility multipliers in marketService.js
```

---

## 🐛 Troubleshooting

### "Missing required environment variable: MONGODB_URI"
- Check `.env` file is in project root
- Verify `MONGODB_URI` is set with correct format
- Test connection: `mongo "mongodb+srv://user:pass@cluster.mongodb.net/dbname"`

### "Failed to register commands"
- Verify `CLIENT_ID` and `GUILD_ID` are correct
- Check bot has `applications.commands` scope in Discord portal
- Try again (Discord API can be rate-limited)

### "Race condition: supply went negative"
- If using old code, this was the bug (now fixed)
- Update to latest version with `buyShares()` transaction fix

### "Cooldown check fails"
- Verify `config.cooldowns['buy']` is defined
- Check `checkCooldown()` is called BEFORE `deferReply()`

### Bot unresponsive after passive drift
- Check MongoDB connection status
- Increase batch size in `applyPassiveDrift()` if 1000+ characters
- Look for timeouts in console logs

---

## 📚 Files Changed

### Core Business Logic
- `src/services/userService.js` — Atomic buy/sell with logging
- `src/services/marketService.js` — Batch processing for drift
- `src/config/index.js` — Tuned market impact factors

### Commands
- `src/commands/user/buy.js` — Split cooldown logic
- `src/commands/user/sell.js` — Split cooldown logic

### Utilities  
- `src/utils/validation.js` — Better admin role checking
- `src/utils/cooldown.js` — Documented deprecated method

### Models  
- `src/models/Transaction.js` — NEW: Audit logging
- `src/models/User.js` — Unchanged
- `src/models/Character.js` — Unchanged

### Database
- `src/index.js` — Mongoose strictQuery setting

### Configuration
- `.env.example` — NEW: Detailed instructions
- `package.json` — Explicit dependencies

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review transaction logs in MongoDB for inconsistencies
3. Test with a smaller server first
4. Check Discord.js documentation for command/interaction details

Good luck! 🚀
