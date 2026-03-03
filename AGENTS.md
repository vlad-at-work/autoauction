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

### What works

```yaml
- uses: oven-sh/setup-bun@v2 # no setup-node needed, bun brings its own Node
- run: bun install # NOT npm ci / npm install
- run: bunx prisma generate
- run: bun run build
```

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

### Critical: Next.js Standalone Mode

**1. Environment Variables Are EMBEDDED at Build Time**

Next.js `output: 'standalone'` **inlines** all environment variables from `.env.local` into the compiled server bundle at **build time**. You do NOT need to set these in systemd:

- ❌ `TG_BOT_TOKEN`, `TG_BOT_TOKEN_DEALER`
- ❌ `MAX_BOT_TOKEN`, `MAX_BOT_TOKEN_DEALER`
- ❌ `TG_WEBHOOK_SECRET`, `TG_DEALER_WEBHOOK_SECRET`
- ❌ Database URLs, session secrets, admin passwords
- ❌ All other API keys and tokens

**Only runtime/system env vars go in systemd**:

- ✅ `PORT`, `NODE_ENV`
- ✅ `LOG_DIR`, `LOG_LEVEL` (if runtime configurable)

Systemd service only needs minimal env vars - the app has secrets compiled in.

**2. Instrumentation.ts Does Not Run in Standalone**

`instrumentation.ts` only runs during build, not at runtime. For server-side libraries that need initialization (Hawk, Sentry, etc.), call `init()` at module level in the lib file, not just in `instrumentation.ts`.

---

## Messaging & Formatting Rules

- **Emojis in bot messages**: At most 1 emoji at the very start of a message (e.g. 🎉, 👋, 🚗, ❌). Never use emojis inline or mid-message.
- **NEVER use 💰 (money bag emoji)** — it contains a dollar sign and is inappropriate for a Russian-facing product. Use the ruble sign (₽ / `\u20BD` / `&#8381;`) instead.
- **Money formatting**: Always format as `price.toLocaleString('ru-RU')` followed by ` ₽`. Use `formatPrice()` from `src/lib/inquiry-utils.ts` in UI code — it handles both formatting and the ruble sign.

---

## Testing

- Unit tests: `bun run test`
- Build must pass: `bun run build`
- Logs: use `console.warn` (visible in production logs)
