# AutoAuction (svoauto.ru) — Full Project Brief

## What Is It?

A **reverse-auction platform for car purchases** (specifically LADA vehicles), operating as a mini-app inside two Russian messengers: **MAX** (VK's messenger, formerly Mail.ru) and **Telegram**.

- Buyers submit car purchase inquiries
- All registered dealers see every inquiry and compete by submitting price offers
- The buyer picks up to 3 offers to accept
- When accepted, the dealer receives buyer contact info to close the deal offline

The "auction" is reversed: buyers post demand, sellers bid down to win the customer.

---

## Tech Stack

| Layer     | Technology                                                                   |
| --------- | ---------------------------------------------------------------------------- |
| Framework | Next.js 16 (App Router), React 19                                            |
| Database  | Prisma 5 + Neon PostgreSQL (serverless)                                      |
| Auth      | Custom HMAC-SHA256 WebApp validation + HTTP Basic Auth                       |
| UI        | Radix UI, shadcn/ui, Tailwind CSS v4, Framer Motion                          |
| Forms     | React Hook Form + Zod v4 (Russian error messages)                            |
| Bots      | Custom HTTP calls to MAX API + Telegram Bot API                              |
| Logging   | Pino-style JSON via `request-logger.js` + structured app logs                |
| Errors    | Hawk.so                                                                      |
| Testing   | Bun (unit) + Playwright (E2E)                                                |
| Deploy    | Ubuntu + nginx + GitHub Actions rsync (svoauto.ru), Next.js standalone build |

---

## Data Model

```
Buyer
  id, platform (MAX|TELEGRAM), platformUserId, platformChatId
  platformUserName, platformHandle
  phone, phoneVerified
  inquiriesUsedThisMonth, inquiryLimitResetAt
  deletedAt (soft delete)
    └── has many Inquiry

Inquiry
  id, buyerId
  Contact: name, email, phone
  Car: model, submodel, transmission, color, comment
  consentAt (GDPR), createdAt, expiresAt (24h), deletedAt
    ├── has many Offer
    └── has many Transaction

Dealer
  id, username, name, subName, phone, email, description, active
  platform, platformUserId, platformChatId
  inviteToken (6-digit), inviteTokenExpiresAt (7 days)
  deletedAt (soft delete)
    ├── has many Offer
    └── has many Transaction

Offer
  id, inquiryId, dealerId
  price, configuration, deliveryTime, additionalComments
  confirmedMatch, confirmedAt
  deletedAt (soft delete)
    └── has one Transaction (optional)

Transaction (immutable snapshot when offer is accepted)
  id, inquiryId, offerId, dealerId
  Buyer snapshot: buyerName, buyerEmail, buyerPhone,
                  buyerPlatform, buyerPlatformUserId, buyerPlatformHandle
  Inquiry snapshot: model, submodel, transmission, color, price
  Dealer snapshot: username, name, subName, phone, email, description
  Billing: amount, invoicedAt, billedAt, paidAt, voidedAt
  acceptedAt, closedAt, deletedAt
```

---

## System Architecture — Two Bots × Two Roles

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSENGER PLATFORMS                          │
│                                                                 │
│   MAX (platform-api.max.ru)     Telegram (api.telegram.org)    │
│   ┌──────────────────┐          ┌──────────────────┐           │
│   │  Customer Bot    │          │  Customer Bot    │           │
│   │  MAX_BOT_TOKEN   │          │  TG_BOT_TOKEN    │           │
│   └────────┬─────────┘          └────────┬─────────┘           │
│            │ webhooks                    │ webhooks             │
│   ┌──────────────────┐          ┌──────────────────┐           │
│   │  Dealer Bot      │          │  Dealer Bot      │           │
│   │  MAX_BOT_TOKEN   │          │  TG_BOT_TOKEN    │           │
│   │  _DEALER         │          │  _DEALER         │           │
│   └────────┬─────────┘          └────────┬─────────┘           │
└────────────┼────────────────────────────┼────────────────────-─┘
             │                            │
             ▼                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP (svoauto.ru)                     │
│                                                                 │
│  /api/webhooks/max?bot=customer|dealer                         │
│  /api/webhooks/telegram?bot=customer|dealer                    │
│                                                                 │
│  ┌─────────────────────┐  ┌──────────────────────────────┐     │
│  │  Buyer Mini-App     │  │  Dealer Mini-App             │     │
│  │  /app/*             │  │  /dealerinterface/*          │     │
│  │  Auth: customer     │  │  Auth: dealer                │     │
│  └─────────────────────┘  └──────────────────────────────┘     │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Admin Panel /admin/* — Basic Auth (server-rendered)    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Auth header: Bearer {max|telegram}:{customer|dealer}:{data}   │
└─────────────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  NEON PostgreSQL (Prisma)                       │
│  Buyer ─── Inquiry ─── Offer ─── Transaction ─── Dealer        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: Buyer Onboarding & Phone Verification

```
Buyer                    Customer Bot                  App Server
  │                           │                             │
  │  Opens ?start= link       │                             │
  │──────────────────────────▶│                             │
  │                           │  POST /webhooks/{platform}  │
  │                           │  bot_started event          │
  │                           │────────────────────────────▶│
  │                           │                             │  upsert Buyer
  │                           │  "Verify phone" + button    │  (no phoneVerified yet)
  │◀──────────────────────────│                             │
  │                           │                             │
  │  Taps "Share Contact"     │                             │
  │──────────────────────────▶│                             │
  │                           │  POST /webhooks/{platform}  │
  │                           │  message with contact       │
  │                           │────────────────────────────▶│
  │                           │                             │  normalizePhone()
  │                           │                             │  upsert Buyer
  │                           │                             │  phoneVerified = true
  │                           │  "✓ + Create Inquiry" btn   │
  │◀──────────────────────────│                             │
  │                           │                             │
  │  Taps button → opens      │                             │
  │  mini-app at /app?startapp=form                         │
```

---

## Flow 2: Buyer Creates an Inquiry

```
Buyer Mini-App (/app)               App Server             All Dealers (via bot)
       │                                  │                        │
       │  GET /api/buyers/me              │                        │
       │─────────────────────────────────▶│                        │
       │  { phoneVerified: true }         │                        │
       │◀─────────────────────────────────│                        │
       │                                  │                        │
       │  Fills form: model/submodel/     │                        │
       │  transmission/color/comment/     │                        │
       │  name/phone/email/consent        │                        │
       │                                  │                        │
       │  POST /api/inquiries             │                        │
       │─────────────────────────────────▶│                        │
       │                                  │  check limit (2/15d)   │
       │                                  │  create Inquiry (24h)  │
       │                                  │  increment counter     │
       │                                  │                        │
       │                                  │  notifyBuyer("заявка создана")
       │◀─ bot message ──────────────────-│                        │
       │                                  │  forEach active dealer │
       │                                  │─ notifyDealer ────────▶│
       │                                  │  "Новая заявка!"       │
       │  { inquiryId }                   │  + "Open" deep link    │
       │◀─────────────────────────────────│                        │
       │                                  │                        │
       │  navigate to /app/dashboard      │                        │
```

---

## Flow 3: Dealer Submits an Offer

```
Dealer Mini-App                  App Server               Buyer (via bot)
       │                               │                        │
       │  GET /api/dealer/inquiries    │                        │
       │──────────────────────────────▶│                        │
       │  List of all active inquiries │                        │
       │◀──────────────────────────────│                        │
       │                               │                        │
       │  Opens inquiry detail         │                        │
       │  GET /api/dealer/inquiries/id │                        │
       │──────────────────────────────▶│                        │
       │  { inquiry, myOffers,         │                        │
       │    competitors (anon) }       │                        │
       │◀──────────────────────────────│                        │
       │                               │                        │
       │  Fills offer form:            │                        │
       │  price, config, delivery,     │                        │
       │  comments, confirms checkbox  │                        │
       │                               │                        │
       │  POST /api/dealer/offers      │                        │
       │──────────────────────────────▶│                        │
       │                               │  check: not expired    │
       │                               │  check: ≤5 offers      │
       │                               │  check: no accepted yet│
       │                               │  create Offer          │
       │                               │                        │
       │                               │  notifyBuyerOfNewOffer │
       │                               │──────────────────────▶│
       │  { offer }                    │  "Предложение от X"    │
       │◀──────────────────────────────│  + "View" deep link    │
```

---

## Flow 4: Buyer Accepts an Offer

```
Buyer Mini-App                    App Server              Dealer (via bot)
       │                                │                       │
       │  Views /app/inquiry/id         │                       │
       │  Sees offers grouped by dealer │                       │
       │  (competitors NOT anonymized   │                       │
       │   for buyer — full dealer name)│                       │
       │                               │                        │
       │  Taps "Accept" → confirm dialog│                       │
       │                               │                        │
       │  POST /api/transactions        │                       │
       │  { offerId }                   │                       │
       │───────────────────────────────▶│                       │
       │                               │  check: ≤3 accepted    │
       │                               │  check: not expired    │
       │                               │  check: 1 per dealer   │
       │                               │  create Transaction:   │
       │                               │  SNAPSHOT all fields   │
       │                               │                        │
       │                               │  notifyBuyer("принято")│
       │◀─ bot message ────────────────│                        │
       │                               │  notifyDealer          │
       │                               │───────────────────────▶│
       │  { transaction }              │  "Принято! Покупатель: │
       │◀──────────────────────────────│   Иван, +79991234567"  │
       │                               │   + "Open deal" link   │
       │  toast "Предложение принято"  │                        │
```

---

## Flow 5: Dealer Onboarding via Invite

```
Admin Panel          App Server              Dealer Bot              Dealer Mini-App
     │                    │                       │                        │
     │  POST /api/admin/  │                       │                        │
     │  dealers/id/invite │                       │                        │
     │───────────────────▶│                       │                        │
     │                    │  generate 6-digit     │                        │
     │                    │  token (crypto rand)  │                        │
     │                    │  save token+expiry    │                        │
     │  { maxUrl, tgUrl } │                       │                        │
     │◀───────────────────│                       │                        │
     │                    │                       │                        │
  Admin sends link to dealer (copy/paste out of band)
     │                    │                       │                        │
     │          Dealer opens ?start={token} link  │                        │
     │                    │  POST /webhooks/       │                        │
     │                    │  {platform}?bot=dealer │                        │
     │                    │◀──────────────────────│                        │
     │                    │  validate token in DB  │                        │
     │                    │  send welcome +        │                        │
     │                    │  "Open Mini-App" btn   │                        │
     │                    │──────────────────────▶│                        │
     │                    │                       │  Dealer taps button    │
     │                    │                       │  /dealerinterface      │
     │                    │                       │  ?startapp={token}    ▶│
     │                    │                       │                        │
     │                    │  POST /api/dealer/     │                        │
     │                    │  auth/setup {token}    │                        │
     │                    │◀──────────────────────────────────────────────│
     │                    │  validate token        │                        │
     │                    │  bind platform+userId  │                        │
     │                    │  clear token fields    │                        │
     │                    │  dealer now active     │                        │
     │                    │──────────────────────────────────────────────▶│
     │                    │                       │  redirect to /inquiries│
```

---

## Business Rules (Hard Limits)

| Rule                                | Value             | Enforced In                                         |
| ----------------------------------- | ----------------- | --------------------------------------------------- |
| Buyer inquiry limit                 | 2 per 15 days     | `POST /api/inquiries`                               |
| Inquiry lifetime                    | 24 hours          | `expiresAt` field, checked everywhere               |
| Max accepted offers per inquiry     | 3                 | `POST /api/transactions`                            |
| Max accepted per dealer per inquiry | 1                 | `POST /api/transactions`                            |
| Max offers per dealer per inquiry   | 5                 | `POST /api/dealer/offers`                           |
| Phone must be verified              | Yes               | `/api/buyers/me` gate + frontend                    |
| Competitor dealers anonymized       | Yes               | `GET /api/dealer/inquiries/[id]`                    |
| Transaction snapshots               | Immutable         | All contact/car/dealer fields copied at accept time |
| Invite token lifetime               | 7 days            | `isInviteTokenValid()`                              |
| Rate limit: inquiry creation        | 10/min per user   | In-memory limiter                                   |
| Rate limit: webhooks                | 60/min per userId | In-memory limiter                                   |

---

## Directory Map (Critical Files)

```
autoauction/
├── prisma/
│   ├── schema.prisma                          ← SINGLE SOURCE OF TRUTH
│   └── migrations/                            ← 5 migrations so far
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── inquiries/route.ts             ← Buyer creates inquiry
│   │   │   ├── transactions/route.ts          ← Buyer accepts offer
│   │   │   ├── buyers/me/route.ts             ← Buyer profile check
│   │   │   ├── dealer/
│   │   │   │   ├── auth/check/route.ts        ← Dealer auth check
│   │   │   │   ├── auth/setup/route.ts        ← Dealer account claim
│   │   │   │   ├── invite/validate/route.ts   ← Token pre-validation
│   │   │   │   ├── inquiries/route.ts         ← Dealer inquiry list
│   │   │   │   ├── inquiries/[id]/route.ts    ← Dealer inquiry detail
│   │   │   │   ├── inquiries/archived/route.ts← Dealer archive
│   │   │   │   └── offers/route.ts            ← Dealer submits offer
│   │   │   ├── admin/
│   │   │   │   ├── dealers/[id]/invite/route.ts← Generate invite
│   │   │   │   ├── broadcast/route.ts         ← Mass notify buyers
│   │   │   │   └── clear-db/route.ts          ← Nuke DB
│   │   │   ├── webhooks/
│   │   │   │   ├── max/route.ts               ← MAX bot events
│   │   │   │   └── telegram/route.ts          ← Telegram bot events
│   │   │   └── offers/route.ts                ← Legacy Basic Auth
│   │   ├── app/                               ← Buyer mini-app
│   │   │   ├── page.tsx                       ← Entry/routing
│   │   │   ├── form/page.tsx                  ← Inquiry form
│   │   │   ├── dashboard/page.tsx             ← Buyer dashboard
│   │   │   └── inquiry/[id]/
│   │   │       ├── page.tsx                   ← Inquiry + offers
│   │   │       └── offer/[offerId]/page.tsx   ← Accept offer
│   │   ├── dealerinterface/                   ← Dealer mini-app
│   │   │   ├── page.tsx                       ← Entry/auth/invite
│   │   │   ├── setup/page.tsx                 ← Claim account
│   │   │   └── inquiries/
│   │   │       ├── page.tsx                   ← Inquiry list (tabs)
│   │   │       └── [id]/page.tsx              ← Inquiry + offer form
│   │   └── admin/                             ← Server-rendered CRUD
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── webapp-validation.ts           ← HMAC auth (main auth)
│   │   │   ├── basic.ts                       ← Basic Auth (legacy)
│   │   │   └── dealer-invite.ts               ← Token generation
│   │   ├── notifications/
│   │   │   ├── index.ts                       ← Dispatches to MAX/TG
│   │   │   ├── max.ts                         ← MAX API calls
│   │   │   └── telegram.ts                    ← Telegram API calls
│   │   ├── phone.ts                           ← normalizePhone()
│   │   ├── deeplinks.ts                       ← parseStartParam()
│   │   ├── form-options.ts                    ← LADA models/colors/etc.
│   │   ├── constants.ts                       ← All magic numbers
│   │   └── prisma.ts                          ← Prisma client singleton
│   └── middleware.ts                          ← Admin Basic Auth guard
```

---

## Potential Modification Issues

### 1. Adding a new field to Inquiry (e.g. "budget range", "year preference")

**Touch points** (all must be updated or it silently breaks):

- `prisma/schema.prisma` — add the field
- New migration file
- `POST /api/inquiries` — validation schema + DB write
- `GET /api/inquiries/[id]` — return the new field
- `GET /api/dealer/inquiries/[id]` — return the new field
- `GET /api/dealer/inquiries` — list may need it
- `src/app/app/form/page.tsx` — form UI (field + Zod schema)
- `src/app/app/inquiry/[id]/page.tsx` — buyer view
- `src/app/dealerinterface/inquiries/[id]/page.tsx` — dealer view
- `src/lib/form-options.ts` — if it's a new enum option
- Admin inquiry detail/edit page
- Notification messages in `src/lib/notifications/index.ts` — `notifyDealerOfNewInquiryViaBot()` only passes model/submodel/transmission/color; new fields won't appear in bot messages unless added
- **Transaction snapshot**: if the field is important for billing records, it may need to be snapshotted too → add to `Transaction` model + `POST /api/transactions`

**Risk**: The transaction snapshot pattern means important inquiry fields must be explicitly duplicated. There's no automatic "freeze" of the full inquiry state.

---

### 2. Adding a new car model/submodel to the options

- **Only touch**: `src/lib/form-options.ts`
- The `MODEL_SUBMODELS` map drives both the form dropdowns and any validation
- BUT: existing inquiries in DB store the string value, so if you rename a value (not add), old data becomes inconsistent with the new options

---

### 3. Adding a third messenger platform

This is the most structurally invasive change:

- `prisma/schema.prisma` — `Platform` enum: add new value → new migration
- New bot token env vars
- New webhook route (`/api/webhooks/newplatform/route.ts`)
- `src/lib/notifications/newplatform.ts` — notification sender
- `src/lib/notifications/index.ts` — add `else if (platform === 'NEWPLATFORM')` branches in all 4 notify functions
- `src/lib/auth/webapp-validation.ts` — HMAC logic needs new platform's key derivation
- All frontend pages that check `platform === 'max'` or `platform === 'telegram'`
- Admin panel platform display labels
- Deep link formats may differ

---

### 4. Changing the inquiry limit or time window

- `src/lib/constants.ts` — all limits are centralized here
- But `inquiryLimitResetAt` uses a 15-day rolling window set at inquiry creation time; changing the constant doesn't retroactively fix existing buyers' reset dates in DB

---

### 5. Adding a new buyer-facing notification type

- `src/lib/notifications/index.ts` — add new function
- Must handle both `MAX` and `TELEGRAM` branches
- MAX buttons use `open_app` type with `web_app` (bot username) and `payload` (startapp param)
- Telegram buttons use `web_app: { url: ... }` inline keyboard
- Deep link payload must be registered in `src/lib/deeplinks.ts` (`parseStartParam()`)
- Frontend must handle the new startapp param in `src/app/app/page.tsx` routing logic

---

### 6. The in-memory rate limiter will reset on every deploy/restart

The rate limiter (`src/lib/rate-limit.ts`) is in-memory. In production on a single Ubuntu server this is fine, but if you ever scale to multiple processes or add a second server, rate limits become per-process (not global). Not an immediate issue but a scaling trap.

---

### 7. Offer creation uses two separate auth paths

- Buyer-facing flow uses WebApp auth (`Bearer platform:customer:initData`)
- Dealer-facing offers use a different route: `POST /api/dealer/offers` (WebApp auth with `dealer` botType)
- Legacy route `POST /api/offers` uses HTTP Basic Auth (username+password)
- If you're adding dealer features, make sure you're modifying the right route — easy to confuse the two

---

### 8. Phone normalization is the single choke point for buyer identity

`normalizePhone()` in `src/lib/phone.ts` is the only normalization — it only handles Russian numbers (7/8 prefix, 10-11 digits). International numbers will return `null` and the phone verification will silently fail (buyer sent an error message by the bot). If the platform expands internationally, this function needs to be generalized.

---

### 9. The Buyer model has duplicate phone fields

There are TWO phone fields on a buyer:

- `Buyer.phone` + `Buyer.phoneVerified` — set by the bot webhook when user shares contact
- `Inquiry.phone` — collected again in the inquiry form (pre-filled from verified phone but editable)

These can diverge. The transaction snapshot uses `Inquiry.phone` (what was in the form), not `Buyer.phone`. This is intentional (buyer could provide a different callback number per inquiry) but could cause confusion.

---

### 10. Invite tokens are single-use and cleared on setup

Once `POST /api/dealer/auth/setup` succeeds, `inviteToken` and `inviteTokenExpiresAt` are set to `null`. The same token cannot be used again. If a dealer needs to link a second platform account, you'd need to generate a new invite specifically for that platform. Currently there's no "link additional platform" flow — each dealer record supports only one platform binding.

---

### 11. Soft deletes everywhere — queries must always filter `deletedAt: null`

All models use `deletedAt DateTime?`. If you write any new Prisma queries and forget `where: { deletedAt: null }`, you'll silently return deleted records. There is no global Prisma middleware enforcing this — it's manual in every query.

---

### 12. The transaction snapshot has no update path

Once a `Transaction` is created, the snapshotted buyer/dealer info is never updated. If a dealer updates their phone number after a transaction, the transaction still shows the old number. This is intentional for billing immutability but means the admin must rely on the live `Dealer` record for current contact info.

---

## Deployment Architecture (Current)

Two environments on the same VPS (`79.174.80.170`, reg.ru):

```
GitHub repo
    │
    │  push to main → deploy.yml
    │  push to staging → deploy-staging.yml
    ▼
GitHub Actions
    │  bun install + bunx prisma generate
    │  bun run build (= next build --webpack, NEXT_PUBLIC_* from GitHub Secrets)
    │  cp request-logger.js .next/standalone/
    │  rsync .next/standalone/ → Ubuntu server
    │  prisma migrate deploy (SSH)
    │  write HAWK_TOKEN to server .env (SSH)
    │  systemctl restart autoauction[-staging]
    │  deploy + restart Telegram poller
    ▼
Ubuntu VPS (svoauto.ru)
    ├── nginx (reverse proxy)
    │   ├── port 443 → port 3000 (production)
    │   └── port 3001 (staging, internal)
    ├── systemd: autoauction.service (port 3000)
    │   └── node server.js --require request-logger.js
    │       └── connects to Neon PostgreSQL (cloud)
    ├── systemd: autoauction-staging.service (port 3001)
    └── systemd: autoauction-tg-poller.service
        └── scripts/telegram-poller.js (long-poll → POST /api/webhooks/telegram)
```

**Key facts**:

- `NEXT_PUBLIC_*` vars are baked into the bundle at build time from GitHub Secrets
- Server-side secrets live in `/home/autoauction/app/.env` (not in repo)
- `request-logger.js` is preloaded via `node --require` — logs every HTTP request with `ip` and `ua` fields
- Telegram uses long-polling (DPI bypass) instead of webhooks for the customer bot

---

## Summary: What To Check Before Production

1. All 4 bot webhook URLs registered with MAX and Telegram APIs (and pointing to svoauto.ru)
2. `TG_WEBHOOK_SECRET` + `TG_DEALER_WEBHOOK_SECRET` set and matching registered secrets
3. All 4 bot tokens set: `MAX_BOT_TOKEN`, `MAX_BOT_TOKEN_DEALER`, `TG_BOT_TOKEN`, `TG_BOT_TOKEN_DEALER`
4. `POSTGRES_PRISMA_URL` pointing to live Neon DB (not dev branch)
5. `NEXT_PUBLIC_APP_URL` set to `https://svoauto.ru`
6. `ADMIN_USERNAME` / `ADMIN_PASSWORD` set (protects `/admin` and `/api/admin`)
7. `MOCK_WEBAPP_AUTH` must NOT be set (or set to false) in production
8. Prisma migrations are applied to production DB (`prisma migrate deploy`)
9. nginx config in `autoauction/nginx/` is correctly deployed
10. systemd service auto-restarts on failure and starts on boot
