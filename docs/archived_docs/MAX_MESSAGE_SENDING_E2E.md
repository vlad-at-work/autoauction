# MAX message sending (end-to-end)

This project can send a text message to a MAX user via the MAX Platform Bot API using your bot token.

## What you need

- `MAX_BOT_TOKEN` — the bot token from the MAX organization cabinet.
- A recipient `chat_id` — the dialog/chat identifier for the user who has already interacted with your bot (opened the bot chat / mini-app).

MAX API requirements (critical):

- Token goes in the `Authorization` header (no `Bearer` prefix).
- Recipient identifier goes in the URL query string (`?chat_id=...`), not in the JSON body.

## Where the code lives

- Low-level MAX sender: `src/lib/notifications/max.ts`
  - `sendMaxMessage(chatId, text)` -> `POST https://platform-api.max.ru/messages?chat_id=<chat_id>` with JSON `{ "text": "..." }`
- Debug API endpoints (local/dev only):
  - `src/app/api/debug/max/send-test/route.ts` (POST JSON body)
  - `src/app/api/debug/max/ping/route.ts` (GET query params; can fallback to latest MAX buyer in DB)
- CLI helper script:
  - `scripts/test-max-notification.ts`

## Step 1: Configure environment variables

Put this in `.env.local` (or set them in your shell/Vercel environment):

```bash
MAX_BOT_TOKEN="..."
MAX_BOT_NAME="id5010035001_bot" # optional; used for deep links/buttons
```

Optional convenience variables for local testing:

```bash
MAX_TEST_CHAT_ID="142618871" # recipient chat_id
DEBUG_MAX_TEST_MESSAGE_ENABLED="true" # allows debug endpoints even in production-like envs
```

## Step 2: Obtain a recipient `chat_id`

You can get a valid `chat_id` in a few ways:

1. **From the MAX WebApp SDK**: when the user opens the mini-app, `initDataUnsafe.chat.id` is available in the WebApp init data.
2. **From the database**: this app stores it on the buyer record.
   - Field: `Buyer.platformChatId` (falls back to `Buyer.platformUserId` in some flows)
   - Helper: `bun --env-file=.env.local run scripts/show-buyers.ts`

Important: the bot can only message users who have already started a dialog with the bot.

## Step 3A (recommended): Send via CLI script

Send to a specific chat id:

```bash
bun --env-file=.env.local run scripts/test-max-notification.ts <chat_id> "hello!"
```

Or, if you set `MAX_TEST_CHAT_ID`, you can omit the chat id argument:

```bash
MAX_TEST_CHAT_ID="<chat_id>" bun --env-file=.env.local run scripts/test-max-notification.ts "" "hello!"
```

What the script does:

- Builds `https://platform-api.max.ru/messages?chat_id=<chat_id>`
- Sends `POST` with:
  - Header: `Authorization: <MAX_BOT_TOKEN>`
  - JSON body: `{ "text": "..." }`

## Step 3B: Send via local debug API endpoint

1. Start the server:

```bash
bun dev
```

2. Call the endpoint:

```bash
curl -X POST "http://localhost:3000/api/debug/max/send-test" \
  -H "Content-Type: application/json" \
  -d '{"chatId":"<chat_id>","text":"hello!"}'
```

Notes:

- The debug routes are gated by `isDebugSendEnabled()` in each route (preview/dev/non-prod by default, or explicitly via `DEBUG_MAX_TEST_MESSAGE_ENABLED=true`).

## Step 4: Troubleshooting

- `MAX_BOT_TOKEN not configured`: your env var is missing or set to placeholder.
- `Unknown recipient` / 400/404 responses:
  - Wrong `chat_id`, or the user hasn’t opened a dialog with the bot.
  - You accidentally put `chat_id` in the JSON body instead of the URL query string (MAX requires the query param).
- Network errors locally: ensure your machine can reach `https://platform-api.max.ru` and that your environment allows outbound HTTPS.
