# AGENTS.md - Development Guidelines

## Table of Contents

- [Quick Start](#quick-start)
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routes & Apps](#routes--apps)
- [Common Commands](#common-commands)
- [Database](#database)
- [Authentication](#authentication)
- [Flows](#flows)
- [Notifications](#notifications)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Language Note

**UI/UX Language:** Russian (all user-facing text, notifications, forms)
**Development Communication:** English (code comments, commit messages, docs)

Maintain this separation: write code/docs in English, but user strings must be in Russian.

## Quick Start

```bash
nvm use 22
bun install
bun dev
```

**Before committing:** `bun run build` must succeed.

**Do not commit/push unless explicitly asked.**

---

## Project Overview

AutoAuction is a car inquiry/offer platform connecting:

- **Buyers** — via Telegram/MAX mini-app at `/app`
- **Dealers** — via separate dealer mini-app at `/dealerinterface`

**Flow:** Buyer creates inquiry → Dealers submit competing offers (up to 5 per dealer) → Buyer accepts up to 3 offers → Transaction recorded with immutable snapshots.

**Archived docs:** See `docs/archived_docs/` for historical reference (MAX webhook research, migration plans, etc.).

---

## Tech Stack

| Layer      | Technology                           |
| ---------- | ------------------------------------ |
| Runtime    | Bun (use `bun` not `npm`/`yarn`)     |
| Framework  | Next.js 16 with App Router           |
| UI         | shadcn/ui + Tailwind CSS v4          |
| Database   | PostgreSQL via Prisma (Neon for MVP) |
| Deployment | Vercel                               |
| Bots       | Telegram Bot API + MAX Platform API  |

---

## Project Structure

```
src/
  app/
    app/                    # Customer mini-app (buyer flow)
      page.tsx              # Entry, platform detection
      form/page.tsx         # Inquiry form
      dashboard/page.tsx    # Buyer's inquiries
      inquiry/[id]/page.tsx # Inquiry detail
    dealerinterface/        # Dealer mini-app
      page.tsx              # Entry, auth check
      setup/page.tsx        # First-time password set
      login/page.tsx        # Dealer login
      dashboard/page.tsx    # Active inquiries
      inquiry/[id]/page.tsx # Make offer
    admin/                  # Admin dashboard (Basic Auth)
    api/                    # API routes
      inquiries/            # Create/manage inquiries
      dealerinterface/      # Dealer API (offers, auth)
      transactions/         # Accept offers
      webhooks/             # Telegram/MAX webhooks
  components/ui/            # shadcn components
  lib/
    notifications/          # Telegram/MAX messaging
    auth/                   # Auth utilities
    form-options.ts         # Car model/submodel data
    constants.ts            # App constants
  __tests__/                # Tests
    unit/                   # Pure logic tests
    happy/                  # DB integration tests
prisma/
  schema.prisma             # Database schema
scripts/                    # Utility scripts
```

---

## Routes & Apps

### Customer Mini-App (`/app`)

Entry point for buyers via Telegram/MAX WebView.

| Route                               | Purpose                                                  |
| ----------------------------------- | -------------------------------------------------------- |
| `/app`                              | Entry, validates `initData`, routes to form or dashboard |
| `/app/form`                         | Create new inquiry                                       |
| `/app/dashboard`                    | View my inquiries and offers                             |
| `/app/inquiry/[id]`                 | Inquiry detail with offers                               |
| `/app/inquiry/[id]/offer/[offerId]` | Accept specific offer                                    |

### Dealer Mini-App (`/dealerinterface`)

Entry point for dealers via Telegram/MAX WebView.

| Route                             | Purpose                                         |
| --------------------------------- | ----------------------------------------------- |
| `/dealerinterface`                | Entry point, auto-redirects based on auth state |
| `/dealerinterface/setup`          | First-time password setup (after invite link)   |
| `/dealerinterface/login`          | Dealer login                                    |
| `/dealerinterface/dashboard`      | Active inquiries list                           |
| `/dealerinterface/inquiry/[id]`   | Submit offers on inquiry                        |
| `/dealerinterface/reset-password` | Password reset with 6-digit code                |

### Admin Dashboard (`/admin`)

Basic Auth protected. Full CRUD for all data.

| Route                 | Purpose                           |
| --------------------- | --------------------------------- |
| `/admin`              | Dashboard overview                |
| `/admin/buyers`       | Manage buyers                     |
| `/admin/dealers`      | Create dealers, copy invite links |
| `/admin/inquiries`    | Manage inquiries                  |
| `/admin/offers`       | View all offers                   |
| `/admin/transactions` | Transactions + billing fields     |

---

## Common Commands

### Development

```bash
bun dev              # Start dev server
bun build            # Production build (required before commit)
bun lint             # ESLint
```

### Database

```bash
bun run db:generate  # Regenerate Prisma client
bun run db:push      # Push schema changes
bun run db:migrate   # Create/run migrations
bun run db:seed      # Seed test data
bun run db:clear     # ⚠️ Wipe database (dev only)
```

### Testing

```bash
bun test             # Unit tests only
bun run test:live-db # DB integration tests (requires .env.local)
bun run test:suite   # Full flow suite
bun run test:cleanup # Clean test-prefixed data
```

### Utility Scripts

```bash
# Testing notifications
bun run scripts/test-max-notification.ts
bun run scripts/test-telegram-notification.ts

# Database inspection
bun run scripts/show-buyers.ts
bun run scripts/check-buyers.ts
```

---

## Database

### Key Models

| Model               | Key Fields                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------- |
| `Buyer`             | `(platform, platformUserId)` unique, `inquiriesUsedThisMonth` (max 2), `inquiryLimitResetAt`   |
| `Dealer`            | `(platform, platformUserId)` unique (nullable until claimed), `passwordHash`, `platformChatId` |
| `Inquiry`           | `expiresAt` (24h default)                                                                      |
| `Offer`             | Multiple per dealer per inquiry (cap: 5)                                                       |
| `Transaction`       | Unique `(inquiryId, dealerId)`, max 3 per inquiry, immutable snapshots                         |
| `PasswordResetCode` | 6-digit, expires 10 min                                                                        |

### Limits (Enforced in API)

- Buyer: 2 inquiries per 15-day rolling window
- Dealer: 5 offers per inquiry
- Inquiry: 3 accepted offers (transactions) max

### Migration Notes

- MVP uses Neon PostgreSQL
- Production migrates to Yandex Managed PostgreSQL
- Both are standard PostgreSQL — no compatibility issues

---

## Authentication

### Buyers

- Authenticated via Telegram/MAX user ID from `initDataUnsafe.user.id`
- No password required
- Auto-created on first mini-app open

### Dealers

**Registration Flow:**

1. **Admin creates dealer** at `/admin/dealers/new` (username, name, phone, email)
2. **Admin sends invite link** from dealer detail page (Telegram or MAX)
3. **Dealer opens invite link** → binds platform account → sets password → logged in
4. **Subsequent access:** Session valid 7 days, auto-login if valid

**Fallback:** If exactly one unclaimed dealer exists, opening `/dealerinterface` auto-binds without invite link.

**Password Reset:**

- Admin generates 6-digit code (valid 10 min)
- Dealer uses code at `/dealerinterface/reset-password`

### Admins

- Basic Auth via `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars
- Protects `/admin/*` routes

---

## Flows

### Buyer Flow

1. Open `/app` in Telegram/MAX → WebApp SDK detects platform
2. Server validates `initData` → routes to `/app/form` (new) or `/app/dashboard` (existing)
3. Submit inquiry → `POST /api/inquiries`
   - Upserts buyer, checks inquiry limit, creates inquiry (24h expiry)
   - Notifies all active, claimed dealers via dealer bots
4. Dealer submits offers → buyer gets notification with button
5. Buyer accepts offer → `POST /api/transactions`
   - Creates transaction with immutable snapshots
   - Reveals buyer contact to dealer
   - Notifies dealer of acceptance

### Dealer Flow

1. Admin creates dealer profile
2. Admin copies invite link (Telegram or MAX) from dealer detail page
3. Dealer opens link → mini-app binds account → sets password → dashboard
4. Sees active inquiries → submits up to 5 offers per inquiry
5. When buyer accepts → receives notification with buyer contact info

### Inquiry Expiration

- Inquiries expire after 24 hours (`expiresAt`)
- Expired inquiries hidden from dealer dashboard
- Offers rejected with HTTP 410 for expired inquiries

---

## Notifications

### Deep Link Formats

| Platform | Format                                           |
| -------- | ------------------------------------------------ |
| Telegram | `https://t.me/{TG_BOT_NAME}?startapp={param}`    |
| MAX      | `https://max.ru/{MAX_BOT_NAME}?startapp={param}` |

### Key Files

- `src/lib/notifications/index.ts` — High-level notification service
- `src/lib/notifications/telegram.ts` — Telegram Bot API
- `src/lib/notifications/max.ts` — MAX Platform API

### MAX API Notes

- Endpoint: `POST https://platform-api.max.ru/messages?chat_id={chatId}`
- Auth: `Authorization: {MAX_BOT_TOKEN}` (no Bearer prefix)
- May return "Unknown recipient" until webhook/subscription requirements met

### Debug Endpoints

```bash
# Send test message (requires DEBUG_MAX_TEST_MESSAGE_ENABLED=true)
POST /api/debug/max/send-test
{ "chatId": "...", "text": "..." }

# Ping with random message
GET /api/debug/max/ping
```

---

## Environment Variables

### Critical for Local Dev

```env
# Database
POSTGRES_PRISMA_URL="..."
POSTGRES_URL_NON_POOLING="..."

# Admin
ADMIN_USERNAME="..."
ADMIN_PASSWORD="..."

# Session
SESSION_SECRET="..."

# Telegram (customer bot)
TG_BOT_TOKEN="..."
TG_BOT_NAME="..."
NEXT_PUBLIC_TELEGRAM_BOT_NAME="..."

# Telegram (dealer bot)
TG_BOT_TOKEN_DEALER="..."
TG_BOT_NAME_DEALER="..."

# MAX (customer bot)
MAX_BOT_TOKEN="..."
MAX_BOT_NAME="..."
NEXT_PUBLIC_MAX_BOT_NAME="..."

# MAX (dealer bot)
MAX_BOT_TOKEN_DEALER="..."
MAX_BOT_NAME_DEALER="..."
NEXT_PUBLIC_MAX_BOT_NAME_DEALER="..."

# Deep links
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # or deployed URL
```

See README.md for complete env var documentation.

---

## Testing

### Test Structure

```
src/__tests__/
  unit/           # Fast, no DB
    form-options.test.ts
    inquiry-schema.test.ts
    dealer-auth.test.ts
    ...
  happy/          # DB integration (requires .env.local)
    buyer-flow.test.ts
    dealer-interface.test.ts
    admin-flow.test.ts
    ...
```

### Running Tests

```bash
# Unit only (fast)
bun test

# With DB (slower, needs env)
bun run test:live-db

# Full suite
bun run test:suite

# Cleanup test data (prefix-based)
bun run test:cleanup
```

### Test Data Cleanup

Test files use `TEST_DATA_PREFIX` constant for isolation. Cleanup scripts remove data with these prefixes.

---

## Vercel MCP Integration

Vercel MCP provides AI-powered access to your Vercel project. With it, I can:

- **Check deployment status** — View latest deployments, build logs, errors
- **Read/update environment variables** — Add/remove env vars without Vercel UI
- **Analyze build failures** — Query deployment logs for error patterns
- **List domains & aliases** — See production/preview URLs
- **Trigger redeploys** — Promote deployments or retry failed builds

### MCP Setup (One-time)

1. **Install Vercel MCP in Cursor/VS Code:**
   - Open Cursor settings → MCP
   - Add server: `https://mcp.vercel.com`
   - Or use one-click install: https://vercel.com/docs/ai-resources/vercel-mcp

2. **Authorize access:**
   - Browser opens to vercel.com
   - Log in with your Vercel account
   - Grant access to `autoauction` project

3. **Project-specific URL (recommended):**
   - Use: `https://mcp.vercel.com/<your-team>/autoauction`
   - This auto-fills project context in all queries

### MCP Usage Examples

Once connected, I can run queries like:

- "Check latest deployment status"
- "Show production env vars (sensitive values redacted)"
- "Why did the last build fail?"
- "List recent preview deployments"
- "Set env var X to value Y"

**Note:** I cannot create new projects or delete existing ones. I also cannot access deployment logs containing sensitive data unless explicitly allowed.

## Troubleshooting

### Build Issues

| Issue         | Fix                                   |
| ------------- | ------------------------------------- |
| Prisma errors | `bun run db:generate`                 |
| Type errors   | Check `strict: true` in tsconfig.json |
| Lint failures | `bun lint --fix`                      |

### Runtime Issues

| Issue                              | Cause                                     | Fix                                               |
| ---------------------------------- | ----------------------------------------- | ------------------------------------------------- |
| "Something went wrong" in Telegram | Mini-app URL not configured in BotFather  | Configure Web App URL in @BotFather               |
| "Не нашли чат" in MAX              | Mini-app not registered in MAX cabinet    | Register in MAX developer cabinet                 |
| "Unknown recipient" (MAX)          | Missing webhook/subscription              | See `docs/archived_docs/MAX_WEBHOOK_RESEARCH.md`  |
| "Not registered" (dealer)          | Dealer profile not created or not claimed | Admin creates dealer → sends invite link          |
| "Needs invite" (dealer)            | Multiple unclaimed dealers                | Use invite link from admin dealer detail          |
| Buttons open wrong domain          | `NEXT_PUBLIC_APP_URL` not set             | Set env var or rely on `VERCEL_URL`               |
| Missing notifications              | Dealer not claimed or no bot tokens       | Verify dealer has `platform`/`platformUserId` set |

### Database Issues

```bash
# Reset Prisma client
rm -rf node_modules/.prisma && bun run db:generate

# Check connection
bun run scripts/show-buyers.ts

# Nuclear option (dev only)
bun run db:clear
```

---

## Reference Data

### Car Models & Submodels

Source of truth: `src/lib/form-options.ts`

Key exports:

- `MODEL_SUBMODELS` — Map of models to submodels
- `STATUS_OPTIONS` — SVO status options
- `TRANSMISSION_OPTIONS` — Transmission types
- `COLOR_OPTIONS` — Color options

### Constants

Source: `src/lib/constants.ts`

- `MAX_OFFERS_PER_INQUIRY = 5`
- `MAX_TRANSACTIONS_PER_INQUIRY = 3`
- `MAX_INQUIRIES_PER_PERIOD = 2`
- `INQUIRY_LIMIT_DAYS = 15`
- `INQUIRY_EXPIRY_HOURS = 24`
- `SESSION_MAX_AGE_DAYS = 7`

---

## Bot Setup Checklist

### Telegram (Customer Bot)

- [ ] @BotFather: Create bot
- [ ] @BotFather: Configure Mini App URL (`/mybots` → Bot Settings → Configure Mini App)
- [ ] Set URL to `{NEXT_PUBLIC_APP_URL}/app`

### Telegram (Dealer Bot)

- [ ] @BotFather: Create separate dealer bot
- [ ] @BotFather: Configure Mini App URL to `{NEXT_PUBLIC_APP_URL}/dealerinterface`

### MAX (Customer Bot)

- [ ] MAX organization cabinet (requires verified Russian юрлицо)
- [ ] Navigate to: Чат-бот и мини-приложение → Настроить
- [ ] Enter Mini App URL: `{NEXT_PUBLIC_APP_URL}/app`
- [ ] Wait for moderation (up to 48h)

### MAX (Dealer Bot)

- [ ] Same as above, URL: `{NEXT_PUBLIC_APP_URL}/dealerinterface`

---

## Message Conventions

- End messages with: Files changed/added, lines affected, commit message (even if no commit)
- Always end with 1-2 line summary of changes/reasoning
- Do not modify `TODO.md` unless explicitly asked
- Do not create additional `.md` files unless specifically asked

## Autocommit Policy

If the work is complete in one go (all changes made, tested, and build passes), **autocommit but do not autopush**:

1. Stage all changes: `git add -A`
2. Commit with descriptive message following the format above
3. Stop — do not push unless explicitly requested

This keeps the commit history clean while ensuring no work is lost.
