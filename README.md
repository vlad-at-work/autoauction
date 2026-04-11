# AutoAuction (svoauto.ru)

A **reverse-auction platform for car purchases** (LADA vehicles), operating as a mini-app inside **MAX** (VK's messenger) and **Telegram**. Buyers submit car inquiries; all registered dealers compete by submitting price offers; the buyer accepts up to 3 offers; the system records transactions with immutable snapshots for billing.

## Tech Stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Runtime   | Bun                                                                           |
| Framework | Next.js 16 (App Router), React 19                                             |
| DB        | Neon PostgreSQL via Prisma 5                                                  |
| Auth      | Custom HMAC-SHA256 WebApp validation + HTTP Basic Auth (admin)                |
| UI        | Radix UI, shadcn/ui, Tailwind CSS v4, Framer Motion                           |
| Forms     | React Hook Form + Zod v4 (Russian error messages)                             |
| Bots      | Custom HTTP calls to MAX API + Telegram Bot API                               |
| Logging   | Pino-style JSON via `request-logger.js` (monkeypatch) + structured app logs   |
| Errors    | Hawk.so                                                                       |
| Testing   | Bun (unit) + Playwright (E2E)                                                 |
| Deploy    | Ubuntu VPS (reg.ru) + nginx + GitHub Actions rsync, Next.js standalone output |

## App Routes

**Buyer mini-app** (`/app/*`):

- `/app` — Entry / platform detection / phone-gate routing
- `/app/form` — Inquiry creation form
- `/app/dashboard` — Buyer's inquiry list (manual refresh)
- `/app/inquiry/[id]` — Inquiry detail + offers
- `/app/inquiry/[id]/offer/[offerId]` — Accept offer confirmation

**Dealer mini-app** (`/dealerinterface/*`):

- `/dealerinterface` — Entry / auth check / invite token handling
- `/dealerinterface/setup` — First-time account claim (set password)
- `/dealerinterface/inquiries` — Active + archived inquiry tabs
- `/dealerinterface/inquiries/[id]` — Inquiry detail + offer form

**Admin** (`/admin/*`, HTTP Basic Auth):

- `/admin` — Dashboard
- `/admin/buyers`, `/admin/dealers`, `/admin/inquiries`, `/admin/offers`, `/admin/transactions`
- `/admin/logger` — Live structured log viewer (polls every 2s, filter, expand rows, copy JSON)
- `/admin/notifications` — Mass broadcast

## Data Model (Prisma)

```
Buyer (unique: platform + platformUserId)
  phone, phoneVerified
  inquiriesUsedThisMonth (max 2), inquiryLimitResetAt (rolling 15-day window)
  └── has many Inquiry

Inquiry
  Contact: name, email, phone
  Car: model, submodel, transmission, color, comment
  expiresAt (24h from creation), deletedAt (soft)
  ├── has many Offer
  └── has many Transaction

Dealer (unique: platform + platformUserId; nullable until claimed)
  inviteToken (6-digit), inviteTokenExpiresAt (7 days)
  passwordHash, platformChatId
  └── has many Offer, Transaction

Offer (max 5 per dealer per inquiry)

Transaction (max 3 per inquiry; unique per dealerId+inquiryId)
  — immutable snapshot of buyer contact, platform identity, car details, dealer info
  — billing fields: amount, invoicedAt, billedAt, paidAt, voidedAt
```

**Soft deletes everywhere**: all models have `deletedAt`. Every Prisma query must filter `deletedAt: null`.

## Environment Variables

Server-side secrets live in `/home/autoauction/app/.env` (not in repo). `NEXT_PUBLIC_*` vars are baked in at build time via GitHub Secrets → build env.

**Database:**

- `POSTGRES_PRISMA_URL` (pooling), `POSTGRES_URL_NON_POOLING` (direct)

**Admin:**

- `ADMIN_USERNAME`, `ADMIN_PASSWORD`

**Dealer session:**

- `SESSION_SECRET`

**Hawk error tracking:**

- `HAWK_TOKEN` — written to server `.env` by deploy workflow; also needs to be present at build for `NEXT_PUBLIC_SENTRY_DSN`

**Telegram (customer bot):**

- `TG_BOT_TOKEN`, `TG_BOT_NAME`, `TG_WEBHOOK_SECRET`
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME`

**Telegram (dealer bot):**

- `TG_BOT_TOKEN_DEALER`, `TG_BOT_NAME_DEALER`, `TG_DEALER_WEBHOOK_SECRET`

**MAX (customer bot):**

- `MAX_BOT_TOKEN`, `MAX_BOT_NAME`, `NEXT_PUBLIC_MAX_BOT_NAME`

**MAX (dealer bot):**

- `MAX_BOT_TOKEN_DEALER`, `MAX_BOT_NAME_DEALER`, `NEXT_PUBLIC_MAX_BOT_NAME_DEALER`

**App URL (build-time, baked in):**

- `NEXT_PUBLIC_APP_URL` — e.g. `https://svoauto.ru`; used in all bot deep-link buttons

## Core Flows

### 1. Buyer onboarding (phone verification)

Both platforms require phone verification before inquiry creation:

1. Buyer opens `?start=` link → bot sends `request_contact` button
2. Buyer taps → platform sends contact → webhook calls `normalizePhone()` → `Buyer.phoneVerified = true`
3. Bot replies with "Create inquiry" button (opens mini-app)
4. Without verified phone, `/app` shows a gate screen

Existing buyers before phone verification was added must `/start` the bot again.

### 2. Buyer creates inquiry

1. `/app` validates `initData` (HMAC), detects platform, routes to `/app/form` or `/app/dashboard`
2. `POST /api/inquiries` — upserts buyer, checks rolling limit (2/15 days), creates inquiry with 24h expiry, notifies buyer + all active claimed dealers

### 3. Dealer submits offer

1. Dealer sees inquiry in `/dealerinterface/inquiries`
2. `POST /api/dealer/offers` — validates (not expired, ≤5 per dealer, no accepted transaction yet), creates Offer, notifies buyer

### 4. Buyer accepts offer

1. `POST /api/transactions` — validates (≤3 per inquiry, 1 per dealer, not expired), creates Transaction with immutable snapshot, notifies buyer + dealer

### 5. Dealer onboarding via invite

1. Admin creates dealer in `/admin/dealers`, opens detail page, copies invite link (MAX/Telegram)
2. Dealer opens `?start=TOKEN` link → bot sends welcome + "Open mini-app" button → token in `?startapp=`
3. `POST /api/dealer/auth/setup` — validates token, binds platform+userId, clears token, dealer becomes active

Fallback: if exactly one unclaimed dealer exists, opening the dealer mini-app auto-binds without an invite link.

## Notifications & Deep Links

All notification functions live in `src/lib/notifications/index.ts` and dispatch to both MAX and Telegram.

Deep link payload format (URL-safe, `_` separator):

- `inquiry_ID` → opens dealer inquiry detail
- `offer_INQUIRY_OFFER` → opens buyer offer view
- `accepted_INQUIRY_ID` → opens dealer inquiry detail

MAX buttons use `open_app` type with `payload`. Telegram buttons use `web_app: { url: ... }` with the full `?startapp=` URL appended.

## Telegram DPI Bypass Poller

Russia blocks direct Telegram connections. Production uses a **long-polling proxy** instead of webhooks for Telegram customer bot:

- Script: `scripts/telegram-poller.js`
- Service: `autoauction-tg-poller.service` (production), `autoauction-tg-poller-staging.service` (staging)
- State file: `/var/lib/autoauction/tg-poller-offset.json`
- Logs: `journalctl -u autoauction-tg-poller -f`

The poller calls `getUpdates` on the Telegram API and forwards each update to the local app server (`http://localhost:3000/api/webhooks/telegram?bot=customer`). MAX webhooks work normally.

## Webhook Management

| Platform | Bot                            | Webhook URL                         |
| -------- | ------------------------------ | ----------------------------------- |
| MAX      | Customer                       | `/api/webhooks/max?bot=customer`    |
| MAX      | Dealer                         | `/api/webhooks/max?bot=dealer`      |
| Telegram | Customer                       | via poller (not webhook)            |
| Telegram | Dealer (autoauctiondealer_bot) | `/api/webhooks/telegram?bot=dealer` |

Register/check webhooks:

```bash
./scripts/check-hooks.sh
./scripts/setup-hooks.sh           # production
./scripts/setup-hooks.sh https://… # custom domain
./scripts/delete-hooks.sh
```

## Deploy

Two environments on the same VPS (`79.174.80.170`):

| Env        | Branch    | Port | Service                       | Log file                               |
| ---------- | --------- | ---- | ----------------------------- | -------------------------------------- |
| Production | `main`    | 3000 | `autoauction.service`         | `/var/log/autoauction/app.log`         |
| Staging    | `staging` | 3001 | `autoauction-staging.service` | `/var/log/autoauction-staging/app.log` |

GitHub Actions pipeline (both workflows identical except for env/paths):

1. `bun install` (cached)
2. `bunx prisma generate`
3. `bun run build` (with `NEXT_PUBLIC_*` from GitHub Secrets)
4. `cp request-logger.js .next/standalone/`
5. rsync `.next/standalone/` → `/home/autoauction[-staging]/app/`
6. rsync static assets, public/, prisma/
7. `prisma@5.22.0 migrate deploy` (SSH)
8. Write `HAWK_TOKEN` to server `.env` (SSH)
9. `systemctl restart autoauction[-staging]`
10. Deploy + restart Telegram poller
11. Send Telegram status notification

**`NEXT_PUBLIC_*` vars** are baked into the bundle at build time. Server-side secrets read from `/home/autoauction/app/.env` at runtime — the deploy workflow writes `HAWK_TOKEN`; all other secrets must be pre-populated on the server.

### Build command

```bash
bun run build           # = next build --webpack (--webpack flag is intentional)
```

Do NOT use npm/npx for install — Linux native binaries (lightningcss, @tailwindcss/oxide) are missing from npm-generated lockfiles on macOS.

## Local Dev

```bash
nvm use 22
bun install
bun dev
```

## Tests

```bash
bun test                    # unit (fast, no DB)
bun run test:live-db        # integration (live DB)
bun run test:e2e            # Playwright, headless (requires dev server on :3000)
bun run test:e2e:ui         # Playwright with UI
bun run test:full           # unit → integration → E2E
bun run test:cleanup        # remove test_ prefixed DB rows
```

E2E requires `MOCK_WEBAPP_AUTH="true"` in `.env.local` — automatically disabled in production.

Mock auth header format (dev only):

```
Authorization: Bearer mock:<platform>:<botType>:<userId>
```

## Logging & Observability

### Admin logger (primary)

`/admin/logger` — live in-app log viewer. Polls `/api/admin/logs` every 2s. Each entry is a single compressed line; click to expand all fields. Checkboxes + "Copy (N)" to export as JSON.

The underlying log file is tailed by `/api/admin/logs` (excludes itself from logging to avoid recursion).

### Log files

| Env        | File                                   |
| ---------- | -------------------------------------- |
| Production | `/var/log/autoauction/app.log`         |
| Staging    | `/var/log/autoauction-staging/app.log` |

Every HTTP request is logged by `request-logger.js` (preloaded via `node --require`). Each entry includes: `method`, `url`, `status`, `ms`, `ip` (x-forwarded-for or socket), `ua`. Internal endpoints (`/api/admin/logs`, `/api/health`) are excluded.

App code uses structured pino-style JSON with contextual fields (`route`, `platform`, `updateType`, etc.).

```bash
# Live tail with pretty-print
tail -f /var/log/autoauction/app.log | jq '.'

# Errors only
grep '"level":50' /var/log/autoauction/app.log

# Telegram poller logs
journalctl -u autoauction-tg-poller -f
```

### Logdy (secondary, production only)

A Logdy process reads `app.log` and exposes a web UI on port 8080 (`logdy.service`). Tunnel via SSH to access it locally:

```bash
ssh -L 18080:127.0.0.1:8080 root@79.174.80.170
# then open http://127.0.0.1:18080
```

### Log rotation

`/etc/logrotate.d/autoauction` — daily, 30 days, compressed. Emergency cleanup:

```bash
systemctl stop autoauction
gzip /var/log/autoauction/app.log   # or truncate: > /var/log/autoauction/app.log
systemctl start autoauction
```

## Server Configuration

Reference copies of running server configs are versioned in the repo for disaster recovery:

```
systemd/
├── autoauction.service               # Main app (port 3000)
├── autoauction-tg-poller.service     # Telegram poller (production)
├── autoauction-tg-poller-staging.service
├── logdy.service                     # Log viewer (port 8080, prod only)
└── logrotate.conf

nginx/
├── autoauction.conf                  # Reverse proxy + SSL
└── nginx.conf
```

**Secrets not in repo** (must be configured manually on server):

- `/home/autoauction/app/.env` — all bot tokens, DB URLs, session secret, etc.
- `/etc/logdy.env` — Logdy web UI password
- SSL certificates (managed by certbot)

### Rebuild from scratch

```bash
# 1. Create system user
useradd -m -s /bin/bash autoauction

# 2. Create log + state directories
mkdir -p /var/log/autoauction /var/lib/autoauction
chown autoauction:autoauction /var/log/autoauction /var/lib/autoauction

# 3. Install systemd units
sudo cp systemd/*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable autoauction autoauction-tg-poller logdy

# 4. Log rotation
sudo cp systemd/logrotate.conf /etc/logrotate.d/autoauction

# 5. nginx
sudo cp nginx/autoauction.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/autoauction /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 6. SSL
sudo certbot --nginx -d svoauto.ru

# 7. Logdy password
echo 'LOGDY_PASS=yourpassword' | sudo tee /etc/logdy.env
sudo chmod 600 /etc/logdy.env

# 8. App secrets
# Create /home/autoauction/app/.env with all secrets

# 9. First deploy — push to main branch
```

## Troubleshooting

| Symptom                          | Check                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Dealer sees "not registered"     | Admin must create dealer and send invite link                                                                       |
| Dealer sees "needs invite"       | Multiple unclaimed dealers; use invite link                                                                         |
| Buttons open wrong domain        | `NEXT_PUBLIC_APP_URL` must match production domain                                                                  |
| Notifications not arriving       | Dealer must be claimed (`platformUserId` set); verify bot tokens                                                    |
| Buyer sees "confirm your number" | Buyer must `/start` the customer bot and share phone                                                                |
| Telegram updates not processed   | Check `journalctl -u autoauction-tg-poller -f`; check poller offset file                                            |
| Log spam from one IP             | Check nginx access log (`/var/log/nginx/access.log`) for IP + UA; likely stale mini-app WebView in Telegram Desktop |

## Business Rules (Hard Limits)

| Rule                                | Limit                   | Enforced in                      |
| ----------------------------------- | ----------------------- | -------------------------------- |
| Buyer inquiry limit                 | 2 per 15 days (rolling) | `POST /api/inquiries`            |
| Inquiry lifetime                    | 24 hours                | `expiresAt`, checked everywhere  |
| Max accepted offers per inquiry     | 3                       | `POST /api/transactions`         |
| Max accepted per dealer per inquiry | 1                       | `POST /api/transactions`         |
| Max offers per dealer per inquiry   | 5                       | `POST /api/dealer/offers`        |
| Phone must be verified              | Yes                     | `/api/buyers/me` + frontend gate |
| Invite token lifetime               | 7 days                  | `isInviteTokenValid()`           |
| Rate limit (inquiry creation)       | 10/min per user         | in-memory limiter                |
| Rate limit (webhooks)               | 60/min per userId       | in-memory limiter                |

In-memory rate limiter resets on every restart — fine for single-process VPS, trap if ever scaled horizontally.

## Pre-Production Checklist

1. All 4 bot webhook URLs registered (MAX customer/dealer, Telegram dealer; Telegram customer via poller)
2. `TG_WEBHOOK_SECRET` + `TG_DEALER_WEBHOOK_SECRET` match registered secrets
3. All 4 bot tokens set in server `.env`
4. `POSTGRES_PRISMA_URL` pointing to correct Neon DB branch
5. `NEXT_PUBLIC_APP_URL` = `https://svoauto.ru` (prod) in GitHub Secrets
6. `ADMIN_USERNAME` / `ADMIN_PASSWORD` set
7. `MOCK_WEBAPP_AUTH` NOT set (or `false`) in production `.env`
8. Prisma migrations applied (`prisma migrate deploy`)
9. nginx config + SSL certificate active
10. Systemd services enabled and auto-restart configured
