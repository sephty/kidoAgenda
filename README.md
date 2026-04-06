# Discord Stock Bot

A private roleplay Discord bot that simulates a custom stock market where characters act as tradeable stocks.

> **⚠️ Latest Update (v2.0):** Critical race condition fixes, atomic transactions, audit logging, and improved scalability. See [SETUP.md](SETUP.md) for integration instructions.

---

## 🔐 Security & Reliability (v2.0)

✅ **Atomic Transactions** — Buy/sell operations now use Mongoose sessions to prevent race conditions  
✅ **Audit Logging** — All trades recorded to `Transaction` collection for fairness verification  
✅ **Cooldown Protection** — Cooldown only applies after successful transaction  
✅ **Batch Processing** — Passive drift handles 1000+ characters without timeout  
✅ **Input Validation** — Strict integer/float validation prevents bypass exploits  
✅ **Better Error Handling** — Admin role checks no longer crash on edge cases  

---

## Project Structure

```
discord-stock-bot/
├── deploy-commands.js        # One-time script to register slash commands with Discord
├── .env                      # Your configuration (DO NOT commit)
├── .env.example              # Configuration template with setup instructions
├── README.md                 # This file
├── SETUP.md                  # Detailed integration & deployment guide ← START HERE
├── package.json
└── src/
    ├── index.js              # Entry point: boots client, DB, commands, events
    ├── config/
    │   └── index.js          # All env-based config in one place
    ├── models/
    │   ├── Character.js      # Character (stock) schema
    │   ├── User.js           # User (investor) schema
    │   └── Transaction.js    # Transaction audit log (NEW in v2.0)
    ├── services/
    │   ├── marketService.js  # Price logic: events, pressure, drift (now with batch processing)
    │   ├── userService.js    # Buy/sell/balance/portfolio (now with atomic transactions)
    │   └── characterService.js # Character CRUD (admin)
    ├── commands/
    │   ├── admin/
    │   │   ├── addCharacter.js
    │   │   ├── removeCharacter.js
    │   │   ├── event.js
    │   │   ├── setPrice.js
    │   │   ├── addBalance.js
    │   │   ├── removeBalance.js
    │   │   ├── resetUser.js
    │   │   ├── resetCharacter.js
    │   │   └── resetBalances.js         # Reset all users to 0 hullbux
    │   └── user/
    │       ├── balance.js
    │       ├── profile.js
    │       ├── market.js
    │       ├── character.js
    │       ├── buy.js         # (Fixed: cooldown after success)
    │       ├── sell.js        # (Fixed: cooldown after success)
    │       ├── portfolio.js
    │       └── help.js        # Complete game guide
    ├── events/
    │   ├── ready.js           # Client ready handler
    │   └── interactionCreate.js # Routes slash commands to handlers
    └── utils/
        ├── errors.js          # AppError class + replyWithError helper
        ├── validation.js      # Input sanitizers (now with safer admin check)
        ├── cooldown.js        # In-memory rate limiting (split check/set pattern)
        └── embeds.js          # Discord embed builders (no emojis)
```

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18
- MongoDB Atlas account (free tier works great)
- Discord bot token ([Developer Portal](https://discord.com/developers/applications))

### 2. Setup
```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your Discord token, Client ID, Guild ID, and MongoDB URI

# Deploy commands to Discord
npm run deploy

# Start the bot
npm start
```

**For detailed setup with Atlas, see [SETUP.md](SETUP.md).**

---

## Commands

### Admin Commands
> Require the `StockAdmin` role (configurable via `ADMIN_ROLE_NAME` in `.env`).

| Command | Description |
|---|---|
| `/add-character` | Add a new character to the stock market |
| `/remove-character` | Deactivate a character (soft delete) |
| `/event` | Apply a market event (win, loss, scandal, etc.) to a character |
| `/set-price` | Manually override a character's price |
| `/add-balance` | Grant currency to a user |
| `/remove-balance` | Deduct currency from a user |
| `/reset-user` | Reset a user's balance and portfolio to defaults |
| `/reset-character` | Reset a character's price and reputation to base values |
| `/reset-balances` | Reset ALL users' balance to 0 hullbux |

### User Commands

| Command | Description |
|---|---|
| `/balance` | Check your cash balance (private) |
| `/profile` | View your investor profile and net worth |
| `/market` | Browse all active stocks by price |
| `/character <name>` | View a specific character's price, change, volatility, reputation |
| `/buy <character> <amount>` | Purchase shares (atomic transaction, no race conditions) |
| `/sell <character> <amount>` | Sell shares (atomic transaction, no race conditions) |
| `/portfolio` | View all your positions with P&L (private) |
| `/help` | View the complete game guide and commands |

---

## Economy Design

- **Starting balance:** 0 hullbux (earn through trading and events)
- **Prices are dynamic** — influenced by events, trading volume, and reputation drift
- **Supply system** — total shares can be sold, circulating supply tracks holdings
- **Every buy/sell moves price** — (0.01 impact factor = 1% per share, tunable)
- **Admin events** cause larger swings scaled by volatility
- **Passive drift** runs every 24 hours (batched to prevent timeout)

### Event Types
| Type | Base Impact | Rep Delta |
|---|---|---|
| `win` | +15% | +5 |
| `loss` | -12% | -3 |
| `humiliation` | -20% | -8 |
| `achievement` | +25% | +10 |
| `discovery` | +18% | +6 |
| `scandal` | -18% | -7 |
| `alliance` | +10% | +3 |
| `betrayal` | -15% | -6 |
| `comeback` | +30% | +8 |
| `death_rumor` | -25% | -5 |
| `custom` | admin-defined | 0 |

All impacts are multiplied by character volatility and include small random variance.

---

## What's New in v2.0

### 🔴 Critical Fixes
- **Race condition prevention** — Buy/sell now use atomic Mongoose transactions (prevents supply/balance exploits)
- **Cooldown optimization** — Cooldown only applied after successful transaction (prevents retry spam)
- **Input validation** — Strict integer validation across all commands
- **Admin role safety** — Null member checks and case-insensitive role matching

### 🟡 Performance Improvements  
- **Batch processing** — Passive drift handles 1000+ characters without timeout
- **Mongoose strictQuery** — Better schema validation and error isolation
- **Connection pooling** — Optimized MongoDB connection settings

### 🟢 Audit & Compliance
- **Transaction logging** — Every buy/sell/admin action logged to immutable `Transaction` collection
- **Fairness verification** — Query transaction history to verify game integrity
- **Admin action tracking** — Balance add/remove operations recorded with timestamps

---

## Architecture Principles

- **Services contain all business logic** — Commands are thin wrappers
- **Centralized error handling** — All errors typed via `AppError`
- **Input validation before services** — All data sanitized at command level
- **Atomic transactions** — Multi-step operations use Mongoose sessions
- **Immutable audit logs** — Transactions cannot be edited
- **Graceful shutdown** — Proper cleanup on SIGINT/SIGTERM

---

## Integration Guide

To add this system to your existing bot, see [SETUP.md](SETUP.md) — **Option A: Copy Files Into Existing Bot**.

---

## Testing

Run concurrent buy test to verify race condition fix:

```bash
# In Discord (as two users simultaneously):
/buy character:"TestChar" amount:100
/buy character:"TestChar" amount:100

# Expected:
# ✅ One succeeds → price rises, supply decreases
# ❌ One fails → "Cannot buy that many shares. Market is out of stock."
```

---

## Troubleshooting

See [SETUP.md](SETUP.md) — **Troubleshooting** section for:
- MongoDB connection issues
- Command deployment problems
- Cooldown/race condition verification
- Scaling recommendations

---

## License

This project is private. Use and modify for your Discord server only.
