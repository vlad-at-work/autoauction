# IMPORTANT

- DO NOT EDIT .env files without permission

# AutoAuction Project Context

## Package Manager

**Use bun exclusively.** There is a `bun.lock` file. Never use npm or npx for installs/runs.

- Install: `bun install`
- Run scripts: `bun run <script>`
- Execute binaries: `bunx <binary>`

---

## Deploy: GitHub Actions → VPS (reg.ru)

Two environments share the same VPS (`79.174.80.170`):

| Env        | Branch    | Port | Service                       | Workflow             |
| ---------- | --------- | ---- | ----------------------------- | -------------------- |
| Production | `main`    | 3000 | `autoauction.service`         | `deploy.yml`         |
| Staging    | `staging` | 3001 | `autoauction-staging.service` | `deploy-staging.yml` |

### Deploy pipeline (both envs)

```yaml
- bun install (cache-aware)
- bunx prisma generate
- bun run build # = next build --webpack
- cp request-logger.js .next/standalone/
- rsync .next/standalone/ → /home/autoauction[-staging]/app/
- rsync static/, public/, prisma/
- prisma@5.22.0 migrate deploy (SSH)
- write HAWK_TOKEN to server .env (SSH)
- systemctl restart autoauction[-staging]
- deploy + restart Telegram poller
- Telegram status notification
```

### What does NOT work

- `npm ci` / `npm install` — macOS-generated lockfile omits Linux native binaries (lightningcss, @tailwindcss/oxide). Always use bun.

### Build command

`bun run build` = `next build --webpack` — the `--webpack` flag is intentional.

### Environment variables in standalone

`NEXT_PUBLIC_*` vars are **baked into the bundle at build time** (from GitHub Secrets → build env). Server-side secrets are read from `/home/autoauction[‑staging]/app/.env` at runtime. `HAWK_TOKEN` is the only secret written to `.env` by the deploy workflow; all others must be pre-populated on the server.

Adding a new server-side secret:

1. Add to GitHub Secrets
2. Add an SSH step in the deploy workflow to write it to the server's `.env`
3. Access via `process.env.XXX` in code
4. If needed at module init, call your init function at the **bottom of the module file** (not only in `instrumentation.ts` — see `docs/POST_MORTEM_HAWK_INTEGRATION.md`)

### Required GitHub Secrets

**Production:** `VPS_SSH_KEY`, `VPS_HOST`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAX_BOT_NAME`, `NEXT_PUBLIC_MAX_BOT_NAME_DEALER`, `NEXT_PUBLIC_TELEGRAM_BOT_NAME`, `NEXT_PUBLIC_SENTRY_DSN`, `HAWK_TOKEN`, `NOTIFICATION_TG_ID`, `TELEGRAM_BOT_TOKEN`

**Staging:** same with `_STAGING` suffix where applicable (`VPS_SSH_KEY_STAGING`, `VPS_HOST_STAGING`, `NEXT_PUBLIC_APP_URL_STAGING`, `HAWK_TOKEN_STAGING`, etc.)

---

## Project Overview

Next.js 16 app. Prisma + Neon PostgreSQL. Two bot platforms: MAX (Russian messenger) and Telegram. Two bots per platform: customer bot + dealer bot.

All features are working end-to-end:

- Buyer phone verification gate (both platforms)
- Inquiry creation with rolling limit (2 per 15 days)
- Dealer invite flow via 6-digit token (MAX + Telegram)
- Offer submission and buyer notifications
- Transaction creation with immutable snapshots
- Admin panel with CRUD + live logger

---

## MAX Bot API

- Base: `https://platform-api.max.ru`
- Auth header: `Authorization: {token}` (no Bearer prefix, not in URL)
- Send message: `POST /messages?user_id={id}`
- `?start=PARAM` deep links open a chat and fire a `bot_started` webhook — param arrives in `update.payload`
- `?startapp=PARAM` opens the mini-app directly — no webhook, no chat channel
- For dealer invite flow, use `?start=` so a chat channel exists
- MAX buttons: `open_app` type with `web_app` (bot username) and `payload` fields; payload must be URL-safe (A-Z, a-z, 0-9, `_`, `-` only — no colons)

## Telegram Bot API

- Base: `https://api.telegram.org/bot{TOKEN}`
- `/start PARAM` — param follows `/start ` in `message.text`
- Mini-app buttons: `web_app: { url: "https://…/path?startapp=PAYLOAD" }` (full URL)
- Webhook verification: `X-Telegram-Bot-Api-Secret-Token` header
- Telegram customer bot uses **long-polling** (DPI bypass) instead of webhooks — see `scripts/telegram-poller.js` and `autoauction-tg-poller.service`

## WebApp Auth Header

Format: `Bearer {platform}:{botType}:{initData}`

- `platform`: `max` or `telegram`
- `botType`: `customer` or `dealer`
- All three segments required — missing `botType` causes "Invalid token format"
- Validated in `src/lib/auth/webapp-validation.ts` (HMAC-SHA256 for both platforms)

## Deep Link Payload Format

All payloads use `_` as separator (URL-safe for MAX):

- `inquiry_ID` — open dealer inquiry detail
- `offer_INQUIRYID_OFFERID` — open buyer offer view
- `accepted_INQUIRYID` — open dealer inquiry detail (from acceptance notification)
- `setup_DEALERID_TOKEN` — dealer invite claim (handled in dealer entry page)

---

## Key Files

- Buyer webhook MAX: `src/app/api/webhooks/max/route.ts`
- Buyer webhook Telegram: `src/app/api/webhooks/telegram/route.ts`
- Notifications dispatcher: `src/lib/notifications/index.ts`
- MAX sender: `src/lib/notifications/max.ts`
- Telegram sender: `src/lib/notifications/telegram.ts`
- WebApp auth: `src/lib/auth/webapp-validation.ts`
- Dealer invite API: `src/app/api/admin/dealers/[id]/invite/route.ts`
- Phone normalization: `src/lib/phone.ts`
- Deep link parsing: `src/lib/deeplinks.ts`
- Business limits: `src/lib/constants.ts`
- Dealer entry: `src/app/dealerinterface/page.tsx`
- Buyer entry: `src/app/app/page.tsx` (handles all deep link routing)
- Request logger: `request-logger.js` (preloaded via `node --require`, logs ip+ua)
- MAX API reference: `max.txt`

---

## Messaging & Formatting Rules

- **Emojis in bot messages**: At most 1 emoji at the very start of a message. Never inline or mid-message.
- **NEVER use the money bag emoji (💰)** — contains a dollar sign, inappropriate for Russian product. Use `₽` instead.
- **Money formatting**: `price.toLocaleString('ru-RU')` + ` ₽`. Use `formatPrice()` from `src/lib/inquiry-utils.ts` in UI.

---

## Testing

- Unit: `bun run test`
- Integration (live DB): `bun run test:live-db`
- E2E: `bun run test:e2e` (requires dev server + `MOCK_WEBAPP_AUTH=true`)
- Full: `bun run test:full`
- Build must pass: `bun run build`

---

## AI Handoff Hygiene

- Prefer `README.md` + current code over older docs.
- Before major edits, verify against current code in:
  - `.github/workflows/deploy.yml` / `deploy-staging.yml`
  - `src/app/api/webhooks/max/route.ts`
  - `src/app/api/webhooks/telegram/route.ts`
  - `src/lib/notifications/{index,max,telegram}.ts`
- Do not add self-attribution chatter to docs. Keep it factual and action-oriented.
- Git commits: never include "Co-Authored-By" lines.

---

## Logs & Observability

### Application Logs

| Environment | Log File                               | Service                       |
| ----------- | -------------------------------------- | ----------------------------- |
| Production  | `/var/log/autoauction/app.log`         | `autoauction.service`         |
| Staging     | `/var/log/autoauction-staging/app.log` | `autoauction-staging.service` |

Every HTTP request is logged by `request-logger.js` with fields: `method`, `url`, `status`, `ms`, `ip`, `ua`. Internal/noisy endpoints are excluded.

**Admin logger page** (`/admin/logger`): primary in-app viewer — live-tails, filters, expand rows, copy as JSON.

**Logdy** (`logdy.service`, port 8080, production only): secondary viewer. Access via SSH tunnel: `ssh -L 18080:127.0.0.1:8080 root@79.174.80.170`.

### Telegram Poller Logs

```bash
journalctl -u autoauction-tg-poller -f          # production
journalctl -u autoauction-tg-poller-staging -f  # staging
```

### Debugging workflow

1. Check admin logger (`/admin/logger`) first
2. If IP/UA context needed: `tail -f /var/log/nginx/access.log`
3. For Telegram-specific issues: check poller logs
4. For app-level errors: grep `"level":50` in app.log or check Hawk dashboard
