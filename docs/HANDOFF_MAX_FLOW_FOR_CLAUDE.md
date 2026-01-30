# Handoff: MAX “start flow → save inquiry → bot sends message” (AutoAuction)

Date: **2026-01-30**  
Repo: `/Users/vlad/Documents/_projects/_glebproj/autoauction`

This document is intended for another agent (e.g. Claude) to continue work **without re-discovering context**.

---

## 0) Project rules (from `AGENTS.md`)

- Read `docs/max_integration.txt` before changing MAX integration behavior.
- Start sessions with Node via `nvm use 22` (note: Husky uses `.nvmrc`, currently `v20.19.6`).
- Before committing: `bun run build` must succeed.
- If commit fails because of tests: **do not modify tests** to make it pass; fix the code.
- Do not commit/push unless explicitly asked.
- Avoid creating extra `.md` files unless asked (this file is created because the user asked for an in-depth handoff).

---

## 1) Goal

User wants a clean end-to-end flow:

1. User starts from **MAX** (opens bot/mini-app)
2. User submits an inquiry (DB record is created)
3. The bot sends the user a message (either manual trigger for testing, or automatically after submit)

---

## 2) MAX messaging fundamentals (the “token thing”)

MAX Platform Bot API base:

- `https://platform-api.max.ru`

Critical request rules (MAX-specific):

- Bot token goes in header **`Authorization: <token>`** (no `Bearer` prefix).
- Recipient identifier (`chat_id`) goes in the **URL query string**, not the JSON body:
  - `POST /messages?chat_id=<chat_id>`
- Body contains message payload only:
  - `{ "text": "..." }`

References in repo:

- MAX integration notes: `docs/max_integration.txt`
- MAX setup guide: `docs/MAX_BOT_SETUP.md`
- E2E message doc: `docs/MAX_MESSAGE_SENDING_E2E.md`

---

## 3) Where sending is implemented

### Low-level sender

File: `src/lib/notifications/max.ts`

- `sendMaxMessage(chatId, text)`:
  - calls `POST https://platform-api.max.ru/messages?chat_id=<chatId>`
  - headers include `Authorization: process.env.MAX_BOT_TOKEN`
  - body is `{"text": "..."}`

### High-level unified notifications

File: `src/lib/notifications/index.ts`

- `notifyBuyer(...)` and `notifyBuyerOfNewOffer(...)` route to Telegram or MAX.

---

## 4) How the app gets `chat_id`

The system needs a valid `chat_id` to message a user.

Expected sources:

1. From MAX mini-app WebApp init data:
   - `initDataUnsafe.chat.id`
2. Stored in DB:
   - Prisma model: `Buyer.platformChatId` (fallback sometimes uses `Buyer.platformUserId`)

Inquiry creation endpoint updates it when present:

- `src/app/api/inquiries/route.ts`
  - upserts buyer by `(platform, platformUserId)`
  - updates `platformChatId` if request includes it

---

## 5) How to send a message (manual test triggers)

### Option A (recommended): CLI script

File: `scripts/test-max-notification.ts`

Usage:

```bash
bun --env-file=.env.local run scripts/test-max-notification.ts <chat_id> "hello!"
```

Notes:

- Reads `MAX_BOT_TOKEN` from env.
- Uses query param `?chat_id=...` (correct MAX behavior).
- Default message was adjusted earlier (see git status section).

### Option B: Debug API endpoints (when `bun dev` is running)

1) `POST /api/debug/max/send-test`

- File: `src/app/api/debug/max/send-test/route.ts`
- JSON body: `{ "chatId": "...", "text": "..." }`

2) `GET /api/debug/max/ping` (fallback to latest MAX buyer in DB)

- File currently exists locally at `src/app/api/debug/max/ping/route.ts`
- Warning: it is currently **untracked** in git (see git status section below).
- Uses `Buyer` table to find the most recent `platform=MAX` and sends a ping message.

Debug gating:

- Both routes check `isDebugSendEnabled()`
- `DEBUG_MAX_TEST_MESSAGE_ENABLED=true` forces enablement; otherwise it’s enabled in dev/preview/non-prod.

---

## 6) Environment variables (as actually present locally)

`.env.local` contains at least:

- `POSTGRES_PRISMA_URL` (used by Prisma datasource `url`)
- `POSTGRES_URL_NON_POOLING` (used by Prisma datasource `directUrl`)
- `MAX_BOT_TOKEN`
- `MAX_BOT_NAME`
- `TG_BOT_TOKEN`, `TG_BOT_NAME` (and others)

Prisma datasource is defined in `prisma/schema.prisma` as:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

### VERY IMPORTANT: DB is remote Neon

`POSTGRES_PRISMA_URL` points to Neon, host:

- `ep-bitter-hat-ag75k0nc-pooler.c-2.eu-central-1.aws.neon.tech`
- DB name: `neondb`

So **DB wipes affect the remote DB**, not a local sqlite.

---

## 7) DB reset status (already done)

The DB was cleared to restart the MAX flow cleanly using:

```bash
CONFIRM_DELETE_ALL=yes bun --env-file=.env.local run db:cleanup -- --all
```

This deleted:

- `3` inquiries
- `1` buyer
- `0` offers/leads/dealers

Verification command:

```bash
bun --env-file=.env.local run scripts/show-buyers.ts
```

After wipe, it showed `0` buyers.

---

## 8) “Do a clean MAX flow” checklist

1. Start server:

```bash
bun dev
```

2. Open the MAX bot / mini-app.
3. Submit 1 inquiry (should create Buyer + Inquiry and store `platformChatId`).
4. Confirm the saved chat id exists:

```bash
bun --env-file=.env.local run scripts/show-buyers.ts
```

5. Send yourself a message:

```bash
bun --env-file=.env.local run scripts/test-max-notification.ts <chat_id> "hello!"
```

If using debug endpoint:

```bash
curl "http://localhost:3000/api/debug/max/ping?text=hello!"
```

If `ping` returns 404 “No MAX buyer chat_id found”, you didn’t create a buyer record yet, or chat id isn’t being captured.

---

## 9) Current git status (important for continuing work)

At the moment, git has **staged**, **unstaged**, and **untracked** changes.

### Staged (ready to commit, but commit currently blocked by hooks)

- `docs/MAX_MESSAGE_SENDING_E2E.md` (new)
- `scripts/test-max-notification.ts` (modified)
- `src/app/api/debug/max/send-test/route.ts` (modified)

### Unstaged (modified, not staged)

- `src/app/app/dashboard/page.tsx`
- `src/app/app/debug-info/page.tsx`

### Untracked (not in git at all)

- `docs/message/` (contains `business-idea.md`, `send-text-max.md`)
- `src/app/api/debug/max/ping/` (contains `route.ts`)

If you only want to commit the staged set, leave the others alone or explicitly discard/ignore them.

---

## 10) Commit is currently blocked by Husky pre-commit

`.husky/pre-commit` runs:

```sh
. ~/.nvm/nvm.sh
nvm use --silent
bun run test
bunx lint-staged
```

### The failing tests (as observed)

`bun run test` fails in `src/__tests__/unit/bot-links.test.ts` (3 failing assertions).

Root cause appears to be code mismatch in:

- `src/lib/bot-links.ts`

Specifically:

- `getMaxBotUrl` defaults to `'AutoAuctionBot'` but tests expect `'id5010035001_bot'`
- `getTelegramBotUrl` reads `NEXT_PUBLIC_TG_BOT_NAME` and defaults to `'autoauction_bot'`,
  but tests use `NEXT_PUBLIC_TELEGRAM_BOT_NAME` and expect `null` when missing.

Per repo rules: do not change tests to “fix” this; change implementation to match expected behavior.

---

## 11) Proven-good “send message” example (historical)

Before the DB wipe, the latest MAX buyer was:

- MAX `user_id`: `20325912`
- MAX `chat_id`: `142618871`

And the script successfully sent:

- `"one two three123 - send it again"`
- `"321"`

After wipe, these records are removed; you must re-create a buyer by submitting a new inquiry from MAX.

---

## 12) Next steps (recommended)

If the objective is “submit inquiry → auto message user”, implement a server-side send after inquiry creation:

- Candidate location: `src/app/api/inquiries/route.ts` after transaction returns `inquiry.id`
- Use `sendMaxMessage(chatId, "…")` if platform is MAX and chat id is known

Keep in mind:

- Avoid sending in production unless intentional (feature flag / env guard)
- User must have initiated a dialog with the bot; otherwise MAX returns recipient errors

If objective is “manual debug send” only:

- Ensure `src/app/api/debug/max/ping/route.ts` is tracked (if desired) and safe-gated
- Or rely solely on `scripts/test-max-notification.ts`

---

## 13) Quick commands reference

Build:

```bash
bun run build
```

Show buyers (needs DB access):

```bash
bun --env-file=.env.local run scripts/show-buyers.ts
```

Send message:

```bash
bun --env-file=.env.local run scripts/test-max-notification.ts <chat_id> "hello!"
```

Wipe DB (dangerous, remote):

```bash
CONFIRM_DELETE_ALL=yes bun --env-file=.env.local run db:cleanup -- --all
```

