# Telegram Live Testing — Status & TODO

## Current test tiers

| Tier                  | Dir                            | Command                    | When it runs |
| --------------------- | ------------------------------ | -------------------------- | ------------ |
| Unit                  | `src/__tests__/unit/`          | `bun run test`             | pre-push     |
| Routes (mocked)       | `src/__tests__/routes/`        | `bun run test`             | pre-push     |
| Integration (live DB) | `src/__tests__/integration/`   | `bun run test:integration` | manual       |
| Live Telegram canary  | `src/__tests__/live-telegram/` | _(not yet created)_        | —            |

## What's NOT possible yet — and why

### Live Telegram canary tests

The goal: call the real staging Telegram Bot API through the tinyproxy
(`TELEGRAM_PROXY_URL`) and verify that messages are actually delivered,
catching "messages stop arriving through the proxy" failures before
real users discover them.

**Design (when ready to implement):**

1. `proxy-health.test.ts` — `getMe` for both staging bots via proxy → HTTP 200 +
   correct username. `getChatMenuButton` asserts `web_app` type + correct text + URL.
   Latency assertion < 10s.

2. `send-message.test.ts` — `sendMessage` to `TG_TEST_USER_CHAT_ID` → HTTP 200 +
   `message_id` returned. Follow with `editMessageText` on same `message_id` (verifies
   message exists on Telegram's servers). Clean up with `deleteMessage`. Repeat for
   dealer bot. **This is the DPI/proxy delivery canary.**

3. `send-contact-request.test.ts` — send `request_contact` ReplyKeyboardMarkup to test
   user, assert Telegram accepts the shape (400 = builder regression).

4. `get-updates.test.ts` — `getUpdates(offset=-1, limit=1, timeout=0)`, non-destructive
   probe, asserts HTTP 200 and valid envelope without advancing the poller offset.

Run command (once implemented):

```
bun --env-file=.env.staging test src/__tests__/live-telegram
```

**Required env vars to add to `.env.staging`:**

```
TG_TEST_USER_CHAT_ID=<chat_id of fixed staging test account>
```

### Why it's deferred

**Dynamic test user creation is not viable:**
Telegram user accounts require a real phone number + OTP. There is no official API for
programmatic registration. We currently have **one fixed set of staging accounts** — not
enough to create/destroy per test run.

**Options when we want to unblock this:**

**Option A — Telegram test environment (recommended)**

- `test.telegram.org` accepts any 5-digit code for any phone number
- Throwaway accounts, no real SIM required
- Requires creating a _separate_ set of bots on `test.telegram.org` (they are isolated
  from production/staging bots — different server, different API endpoint)
- Zero credential risk; officially supported by Telegram for bot developers

**Option B — MTProto client session**

- Pre-authenticate one staging account using Pyrogram or Telethon
- Store session file in a secret manager (never commit — session = full account access)
- Script sends messages as that user, bot polls `getUpdates` to verify receipt
- More complex, credential-sensitive, but works with existing staging bots

**Option C — Webhook injection only (no real user)**

- POST fabricated Telegram update JSON to `localhost:3000/api/webhooks/telegram`
- Does NOT test the proxy delivery path
- Already covered in Tier 3 integration tests (`webhook-telegram-db.test.ts`)

### Recommended next step

Pursue **Option A**: create a pair of test bots on `test.telegram.org`, implement the
canary suite in `src/__tests__/live-telegram/`, wire a cron or manual script. This has
no credential risk and catches the DPI/proxy failure class automatically.

## Shared helper needed

Extract the proxy curl logic from `scripts/telegram-poller.js` into
`src/lib/telegram/proxy-client.ts` so both the poller and the canary tests share it.
This is a small refactor (no behavior change) that makes the poller testable.
