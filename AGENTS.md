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

Workflow: `.github/workflows/deploy.yml`

### Current deploy pipeline (source of truth)

```yaml
- uses: oven-sh/setup-bun@v2
- run: bun install (cache-aware)
- run: bunx prisma generate
- run: bun run build
- deploy .next/standalone, .next/static, public via ssh-deploy
- restart service via systemctl
```

### Reliability notes for deploys

- Keep deploy **rollback-friendly**: avoid bundling risky behavior changes with infra changes.
- Prefer feature flags for webhook hardening (`WEBHOOK_STRICT_MODE`) and ship default-off first.
- Add/maintain explicit migration gate (`prisma migrate deploy`) before restart when schema changes are present.

### What does NOT work

- `npm ci` — macOS-generated package-lock.json omits Linux native binaries (lightningcss, @tailwindcss/oxide). This is npm bug #4828.
- `npm install` — same problem. Always use bun.

### Deployment

rsync via `easingthemes/ssh-deploy@main`:

- `.next/standalone/` → `/home/autoauction/app/`
- `.next/static/` → `/home/autoauction/app/.next/static/`
- `public/` → `/home/autoauction/app/public/`

App restarts via: `sudo systemctl restart autoauction` (SSH, user `autoauction`)

### Required GitHub Secrets

- `VPS_SSH_KEY`, `VPS_HOST`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MAX_BOT_NAME`, `NEXT_PUBLIC_MAX_BOT_NAME_DEALER`
- `NEXT_PUBLIC_TELEGRAM_BOT_NAME`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NOTIFICATION_TG_ID`, `TELEGRAM_BOT_TOKEN` (deploy status notification step)

### Build note

Build script is `next build --webpack` — the `--webpack` flag is intentional.

---

## Project Overview

Next.js 16 app. Prisma + PostgreSQL (regru cloud). Two bot platforms: MAX (Russian messenger) and Telegram. Two bots per platform: customer bot + dealer bot.

### What Works

1. **Buyer flow**: Users can create inquiries via mini-app
2. **Admin panel**: Create dealers, generate invite links
3. **Database**: Schema supports dealer auth
4. **Dealer invite flow**: Admin creates dealer → invite link → MAX opens chat → dealer clicks "Open App" → mini-app with invite token in URL → sets password → dashboard

---

## MAX Bot API

- Base: `https://platform-api.max.ru`
- Auth header: `Authorization: {token}` (no Bearer prefix, not in URL)
- Send message: `POST /messages?user_id={id}`
- `?start=PARAM` deep links open a chat and fire a `bot_started` webhook — param arrives in `update.payload`
- `?startapp=PARAM` opens the mini-app directly — no webhook, no chat channel
- For dealer invite flow, use `?start=` so a chat channel exists

## WebApp Auth Header

Format: `Bearer {platform}:{botType}:{initData}`

- `platform`: `max` or `telegram`
- `botType`: `customer` or `dealer`
- All three segments required — missing `botType` causes "Invalid token format"

---

## Key Files

- Webhook handler: `src/app/api/webhooks/max/route.ts`
- Dealer invite API: `src/app/api/admin/dealers/[id]/invite/route.ts`
- WebApp validation: `src/lib/auth/webapp-validation.ts`
- Notifications: `src/lib/notifications/max.ts`
- Dealer entry page: `src/app/dealerinterface/page.tsx`
- Dealer setup page: `src/app/dealerinterface/setup/page.tsx`
- MAX API reference: `max.txt`

---

## Environment Variables

- `MAX_BOT_TOKEN` / `MAX_BOT_TOKEN_DEALER` — Bot tokens
- `MAX_BOT_NAME` / `MAX_BOT_NAME_DEALER` — Bot usernames (same as NEXT*PUBLIC* variants)

### Critical: Next.js Standalone Mode (safety-first)

**1. Environment variable behavior must be verified, not assumed**

- Some values may be resolved/inlined at build time in standalone output.
- Other values are still operational runtime configuration and must be managed on server.
- Do **not** rely on blanket assumptions like “everything is compiled in”.
- For any sensitive/revenue-critical flow (MAX/TG tokens, webhook secrets, DB/session/admin secrets), verify where each variable is read in code and how production process receives it.

Practical rule for operators/AI:

- Treat `/home/autoauction/app/.env`, `/etc/logdy.env`, and systemd env as live operational inputs unless verified otherwise by code path + runtime checks.
- After env/config changes, run explicit smoke checks (webhooks + bot send paths where possible).

**2. Instrumentation.ts caveat**

`instrumentation.ts` may not cover all runtime initialization needs in standalone execution contexts. For server-side libraries that must always initialize (Hawk/Sentry/etc.), initialize in the runtime code path that is guaranteed to execute.

---

## Messaging & Formatting Rules

- **Emojis in bot messages**: At most 1 emoji at the very start of a message (e.g. 🎉, 👋, 🚗, ❌). Never use emojis inline or mid-message.
- **NEVER use 💰 (money bag emoji)** — it contains a dollar sign and is inappropriate for a Russian-facing product. Use the ruble sign (₽ / `\u20BD` / `&#8381;`) instead.
- **Money formatting**: Always format as `price.toLocaleString('ru-RU')` followed by ` ₽`. Use `formatPrice()` from `src/lib/inquiry-utils.ts` in UI code — it handles both formatting and the ruble sign.

---

## Testing

- Unit tests: `bun run test`
- Build must pass: `bun run build`
- Treat bot delivery as business-critical: add/maintain integration coverage around webhook ingestion + outbound senders, not only UI/schema tests.
- Logs: use structured logger in app modules; avoid relying on ad-hoc console output as primary observability.

## AI Handoff Hygiene (keep this current)

- Prefer `README.md` + current code over old archived handoffs.
- If writing handoff notes for another AI (including Claude-style), do not add self-attribution chatter. Keep it factual, current, and action-oriented.
- Before major edits, quickly verify assumptions against:
  - `.github/workflows/deploy.yml`
  - `src/app/api/webhooks/max/route.ts`
  - `src/app/api/webhooks/telegram/route.ts`
  - `src/lib/notifications/{max,telegram}.ts`

## Runtime Config Safety (important)

- Do not assume all secrets/config are safely handled only by build-time inlining.
- Next.js standalone may inline some env values at build time, but runtime/service configuration still matters and must be verified per variable usage.
- Treat server env files (`/home/autoauction/app/.env`, `/etc/logdy.env`) and systemd environment as operational source-of-truth for deployed behavior unless code proves otherwise.
- For reliability changes, prefer explicit verification over assumptions:
  - inspect code path where env is read,
  - verify deployed unit/env files,
  - run smoke checks after restart.

## Current Reliability Priorities

- Keep risky webhook hardening behind `WEBHOOK_STRICT_MODE` (default-off rollout first).
- Add webhook idempotency to prevent duplicate side effects on retries/replays.
- Improve outbound message confidence with integration-level tests (provider-facing send paths + delivery/error signal checks), not only unit tests.
