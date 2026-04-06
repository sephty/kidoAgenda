# Discord Stock Bot

A private roleplay Discord bot that simulates a custom stock market where characters act as tradeable stocks.

---

## Project Structure

```
discord-stock-bot/
├── deploy-commands.js        # One-time script to register slash commands with Discord
├── .env.example              # Environment variable template
├── package.json
└── src/
    ├── index.js              # Entry point: boots client, DB, commands, events
    ├── config/
    │   └── index.js          # All env-based config in one place
    ├── models/
    │   ├── Character.js      # Mongoose schema for characters (stocks)
    │   └── User.js           # Mongoose schema for users (investors)
    ├── services/
    │   ├── marketService.js  # Price logic: events, pressure, drift, lookups
    │   ├── userService.js    # Buy/sell/balance/portfolio operations
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
    │   │   └── resetCharacter.js
    │   └── user/
    │       ├── balance.js
    │       ├── profile.js
    │       ├── market.js
    │       ├── character.js
    │       ├── buy.js
    │       ├── sell.js
    │       └── portfolio.js
    ├── events/
    │   ├── ready.js           # Client ready handler
    │   └── interactionCreate.js # Routes slash commands to handlers
    └── utils/
        ├── errors.js          # AppError class + replyWithError helper
        ├── validation.js      # Input sanitizers (price, name, url, etc.)
        ├── cooldown.js        # In-memory per-user per-command rate limiting
        └── embeds.js          # All Discord embed builders (no emojis)
```

---

## Setup

### 1. Prerequisites
- Node.js >= 18
- MongoDB instance (local or Atlas)
- A Discord application with a bot token ([Discord Developer Portal](https://discord.com/developers/applications))

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

Required `.env` keys:
| Key | Description |
|---|---|
| `DISCORD_TOKEN` | Your bot token |
| `CLIENT_ID` | Application (client) ID |
| `GUILD_ID` | Your server's ID |
| `MONGODB_URI` | MongoDB connection string |
| `ADMIN_ROLE_NAME` | Discord role name that grants admin commands (default: `StockAdmin`) |

### 4. Deploy slash commands
This registers the commands with Discord. Run once, or any time you add/modify commands.
```bash
npm run deploy
```

### 5. Start the bot
```bash
npm start
# or for development with auto-reload:
npm run dev
```

---

## Commands

### Admin Commands
> Require the `StockAdmin` role (configurable via `ADMIN_ROLE_NAME`).

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

### User Commands

| Command | Description |
|---|---|
| `/balance` | Check your cash balance (ephemeral) |
| `/profile` | View your investor profile and net worth |
| `/market` | Browse all active stocks by price |
| `/character <name>` | View a specific character's price, change, volatility, reputation |
| `/buy <character> <amount>` | Purchase shares |
| `/sell <character> <amount>` | Sell shares |
| `/portfolio` | View all your positions with P&L (ephemeral) |

---

## Economy Design

- Starting balance: **100 credits** (intentionally low-scale)
- Prices are dynamic — influenced by events, trading volume, and reputation drift
- Every buy nudges price slightly up; every sell nudges it slightly down
- Admin events (wins, scandals, achievements) cause larger swings scaled by volatility
- Passive reputation drift runs every 24 hours

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

All event impacts are multiplied by the character's `volatility` and include a small random variance for realism.

---

## Architecture Notes

- **Services** (`/services`) contain all business logic. Commands are thin wrappers.
- **Errors** are typed via `AppError` and handled centrally via `replyWithError()` — no scattered error strings.
- **Validation** is centralized in `utils/validation.js` — all input is sanitized before reaching services.
- **Cooldowns** are in-memory per-command/per-user with configurable durations in `config/index.js`.
- **Embeds** are fully separated from business logic — change appearance without touching services.
- **Passive drift** is scheduled in the main process via `setTimeout`/`setInterval`. For production at scale, consider moving this to a dedicated job runner.
