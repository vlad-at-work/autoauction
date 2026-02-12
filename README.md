# AutoAuction

AutoAuction is a car inquiry/offer platform connecting **buyers** (Telegram/MAX mini-app) with **dealers** (separate dealer mini-app). Buyers create inquiries, dealers submit competing offers (up to 5 per dealer per inquiry), buyers accept up to 3 offers per inquiry, and the system records **transactions** with immutable snapshots for billing.

All legacy docs were moved to `docs/archived_docs/`. This `README.md` is the single living spec + runbook going forward.

## Tech Stack

- Runtime: Bun
- Framework: Next.js 16 (App Router)
- DB: PostgreSQL (Neon) via Prisma
- Deploy: Vercel
- Bots: Telegram Bot API + MAX Platform API

## App Layouts & Routes

**Buyer mini-app**

- Entry: `/app`
- Create inquiry: `/app/form`
- Dashboard: `/app/dashboard`
- Inquiry detail: `/app/inquiry/[inquiryId]`

**Dealer mini-app**

- Entry: `/dealerinterface`
- Setup password (first time): `/dealerinterface/setup`
- Login: `/dealerinterface/login`
- Dashboard: `/dealerinterface/dashboard`
- Inquiry detail + offer form: `/dealerinterface/inquiry/[id]`

**Admin**

- Dashboard: `/admin`
- Buyers: `/admin/buyers`
- Dealers: `/admin/dealers`
- Inquiries: `/admin/inquiries`
- Offers: `/admin/offers`
- Transactions: `/admin/transactions` (includes billing fields)

**Legacy dealer dashboard (basic auth; optional)**

- `/dealer/*` and `/api/offers` are protected by legacy `DEALER_CREDENTIALS` and are not used by the dealer mini-app flow.

## Data Model (Prisma)

- `Buyer` (unique: `(platform, platformUserId)`)
  - Inquiry limit: `inquiriesUsedThisMonth` (max 2), `inquiryLimitResetAt` (rolling 15-day reset window)
- `Dealer` (unique: `(platform, platformUserId)`; nullable until claimed)
  - `passwordHash` set by dealer on first login
  - `platformChatId` stored for notifications
- `Inquiry`
  - `expiresAt` defaults to 24h from creation
- `Offer`
  - Multiple per dealer per inquiry (cap enforced in API = 5)
- `Transaction`
  - Unique per `(inquiryId, dealerId)`
  - Max 3 per inquiry enforced in API
  - Stores immutable snapshots (`offerPrice`, `dealerName`, `inquiryModel`, etc.)
  - Manual bookkeeping fields: `amount`, `invoicedAt`, `billedAt`, `paidAt`, `voidedAt`
- `PasswordResetCode`
  - 6-digit, expires after 10 minutes

## Environment Variables (Vercel + `.env.local`)

Do not commit secrets; this list is names/meaning only.

**Database**

- `POSTGRES_PRISMA_URL` (pooling)
- `POSTGRES_URL_NON_POOLING` (direct)

**Admin auth**

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

**Dealer session**

- `SESSION_SECRET` (signs dealer session + claim tokens)

**Telegram (customer bot)**

- `TG_BOT_TOKEN`
- `TG_BOT_NAME`
- `TG_WEBHOOK_SECRET`
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME` (used for deep links)

**Telegram (dealer bot)**

- `TG_BOT_TOKEN_DEALER`
- `TG_BOT_NAME_DEALER`
- `TG_DEALER_WEBHOOK_SECRET`

**MAX (customer bot)**

- `MAX_BOT_TOKEN`
- `MAX_BOT_NAME`
- `NEXT_PUBLIC_MAX_BOT_NAME` (used for deep links)

**MAX (dealer bot)**

- `MAX_BOT_TOKEN_DEALER`
- `MAX_BOT_NAME_DEALER`
- `NEXT_PUBLIC_MAX_BOT_NAME_DEALER`

**Deep-link base URL (strongly recommended)**

- `NEXT_PUBLIC_APP_URL`
  - Used for Telegram `web_app` buttons and dealer/buyer notification buttons.
  - Fallback logic: `https://$VERCEL_URL` on Vercel, else `http://localhost:3000`.

**Legacy (optional)**

- `DEALER_CREDENTIALS` (basic auth for `/dealer/*` and `/api/offers`)

## Core Flows

### Buyer flow (create inquiry → offers → accept)

1. Buyer opens `/app` in Telegram/MAX WebView.
2. App validates WebApp `initData` server-side and routes to:
   - `/app/form` (first time) or
   - `/app/dashboard` (existing buyer).
3. Buyer submits inquiry → `POST /api/inquiries`
   - Upserts buyer, checks rolling limit, creates inquiry with 24h expiry.
   - Sends buyer confirmation notification.
   - Notifies all **active + claimed** dealers (platform bound) via dealer bots.
4. Dealer submits offer(s) → `POST /api/dealerinterface/offer`
   - Cap: 5 offers per dealer per inquiry.
   - Buyer gets a notification with a button to open offers (`/app?startapp=inquiry:<id>`).
5. Buyer accepts an offer → `POST /api/transactions`
   - Cap: 3 accepted offers per inquiry.
   - Creates transaction with immutable snapshots + reveals buyer contact data to the dealer.
   - Notifies dealer (accepted) via dealer bot with “Open inquiry” button.

### Dealer flow (pre-created dealer → claim → password → offers)

Simple language:

1. Admin creates a dealer profile in `/admin/dealers` (no platform IDs required).
2. Admin opens dealer detail page and copies the **invite link** (Telegram/MAX).
3. Dealer opens the invite link on their phone → dealer mini-app binds that phone account to the dealer profile.
4. Dealer sets password on first run and becomes logged in (session cookie, long-lived).
5. Dealer sees inquiries, submits offers, and receives notifications.

Fallback behavior:

- If there is **exactly one** unclaimed dealer in the system, opening the dealer mini-app can auto-bind without an invite link.
- If there are **multiple** unclaimed dealers, the dealer must use an invite link.

### Admin flow

- Admin uses `/admin` (Basic Auth).
- CRUD: buyers, dealers, inquiries, offers, transactions.
- Transactions show immutable snapshots + editable billing fields.

## Notifications & Deep Links

Buyer notifications (customer bots):

- Offer notifications include an “Open offers” button using `startapp=inquiry:<inquiryId>`.

Dealer notifications (dealer bots):

- New inquiry + acceptance notifications include “Open inquiry” button using `startapp=inquiry:<inquiryId>`.

MAX caveat:

- MAX may respond with `"Unknown recipient"` until webhook/subscription + user-initiated chat requirements are satisfied (see `docs/archived_docs/MAX_WEBHOOK_RESEARCH.md`).

## Webhook Management

The app supports **dual-bot architecture**: separate bots for customers (buyers) and dealers on both Telegram and MAX platforms. Webhooks are configured via API (not UI).

### Current Status (Production)

| Platform | Bot                            | Status    | Webhook URL                           |
| -------- | ------------------------------ | --------- | ------------------------------------- |
| MAX      | Customer (id5010035001_bot)    | ✅ Active | `/api/webhooks/max?bot=customer`      |
| MAX      | Dealer (id5010035001_1_bot)    | ✅ Active | `/api/webhooks/max?bot=dealer`        |
| Telegram | Customer (autoauction_bot)     | ✅ Active | `/api/webhooks/telegram?bot=customer` |
| Telegram | Dealer (autoauctiondealer_bot) | ✅ Active | `/api/webhooks/telegram?bot=dealer`   |

### Management Scripts

```bash
# Check current webhook status
./scripts/check-hooks.sh

# Register/update all webhooks (production)
./scripts/setup-hooks.sh

# Register webhooks for development (e.g., ngrok)
./scripts/setup-hooks.sh https://abc123.ngrok.io

# Delete all webhooks (switch to polling)
./scripts/delete-hooks.sh
```

### Manual Webhook Setup (if needed)

**MAX Platform:**

```bash
# Customer bot
curl -X POST https://platform-api.max.ru/subscriptions \
  -H "Authorization: $MAX_BOT_TOKEN" \
  -d '{"url": "https://autoauction-two.vercel.app/api/webhooks/max?bot=customer"}'

# Dealer bot
curl -X POST https://platform-api.max.ru/subscriptions \
  -H "Authorization: $MAX_BOT_TOKEN_DEALER" \
  -d '{"url": "https://autoauction-two.vercel.app/api/webhooks/max?bot=dealer"}'
```

**Telegram:**

```bash
# Customer bot
curl -X POST "https://api.telegram.org/bot$TG_BOT_TOKEN/setWebhook" \
  -d '{"url": "https://autoauction-two.vercel.app/api/webhooks/telegram?bot=customer", "secret_token": "'$TG_WEBHOOK_SECRET'"}'

# Dealer bot
curl -X POST "https://api.telegram.org/bot$TG_BOT_TOKEN_DEALER/setWebhook" \
  -d '{"url": "https://autoauction-two.vercel.app/api/webhooks/telegram?bot=dealer", "secret_token": "'$TG_DEALER_WEBHOOK_SECRET'"}'
```

## Local Dev

```bash
nvm use 22
bun install
bun dev
```

## Automated Tests

### Unit Tests (Fast, No DB)

```bash
bun test
```

### Integration Tests (Live DB)

```bash
bun run test:live-db
```

### E2E Tests (Playwright)

Requires dev server running on `:3000` with `MOCK_WEBAPP_AUTH=true` in `.env.local`:

```bash
# Terminal 1: Start dev server
bun dev

# Terminal 2: Run E2E tests
bun run test:e2e           # Headless
bun run test:e2e:ui        # With UI viewer
bun run test:e2e:prod      # Against production
```

### Full Test Suite

Runs unit → integration → E2E with cleanup between:

```bash
bun run test:full
```

### Test Data Cleanup

```bash
bun run test:cleanup       # Clean test_ prefixed data
bun run db:clear           # Nuclear option (dev only)
```

### Build

```bash
bun run build
```

### Mock Auth (Development Only)

For E2E testing without real Telegram/MAX accounts, add to `.env.local`:

```env
MOCK_WEBAPP_AUTH="true"
```

This enables mock authentication via headers:

```
Authorization: Bearer mock:<platform>:<botType>:<userId>
```

**⚠️ Only works in development** — Automatically disabled in production.

## Manual Test (Two Phones) — Condensed

### Admin (computer)

1. Open `/admin` (Basic Auth).
2. Create dealer in `/admin/dealers/new`.
3. Open the dealer → copy invite link (Telegram or MAX) → send to Phone 1 (dealer).

### Phone 1 (Dealer)

1. Open invite link in the dealer messenger (Telegram/MAX) → opens dealer mini-app.
2. Set password (first time) → lands on dealer dashboard.
3. Wait for buyer inquiry → open inquiry → submit 3 offers (e.g. 1,500,000 → 1,450,000 → 1,400,000).
4. After buyer accepts, confirm you receive acceptance notification and can see buyer contact info in the dealer inquiry view.

### Phone 2 (Buyer)

1. Open customer bot → open mini-app → create inquiry.
2. Confirm inquiry appears on buyer dashboard and offer notifications arrive.
3. Open offers from notification (or dashboard) → accept best offer.
4. Confirm UI updates: accepted offer marked, other offers disabled for that dealer, acceptance counter increments.

## Troubleshooting

- Dealer sees “not registered”: admin must create dealer and/or send invite link; dealer can also share their platform ID to admin.
- Dealer sees “needs invite”: there are multiple unclaimed dealers; use invite link from admin dealer detail.
- Buttons open wrong domain: set `NEXT_PUBLIC_APP_URL` (or confirm `VERCEL_URL` is present on Vercel).
- Notifications missing: ensure dealer is claimed (`platform`, `platformUserId` set) and bot tokens are configured.
