# Telegram Bot Testing Guide (AutoAuction)

Date: **2026-01-30**  
Repo: `/Users/vlad/Documents/_projects/_glebproj/autoauction`

This document mirrors the MAX flow testing guide but for Telegram.

---

## 1) Goal

Clean end-to-end flow for Telegram:

1. User starts from **Telegram** (opens bot/mini-app)
2. User submits an inquiry (DB record is created)
3. The bot sends the user a message confirming receipt or notifying of new offers

---

## 2) Telegram Bot API fundamentals

Telegram Bot API base:

- `https://api.telegram.org/bot<BOT_TOKEN>/`

Critical request rules:

- Bot token goes in the URL path: `/bot<TOKEN>/sendMessage`
- All parameters (including `chat_id`) go in the JSON body
- Standard REST API conventions apply

Key differences from MAX:

| Aspect                   | MAX                             | Telegram                       |
| ------------------------ | ------------------------------- | ------------------------------ |
| Token location           | Header `Authorization: <token>` | URL path `/bot<token>/`        |
| chat_id location         | URL query `?chat_id=...`        | JSON body `{"chat_id": "..."}` |
| Button type for mini-app | `link` with `url`               | `url` with `url`               |

References in repo:

- Telegram implementation: `src/lib/notifications/telegram.ts`
- Unified notifications: `src/lib/notifications/index.ts`

---

## 3) Where sending is implemented

### Low-level sender

File: `src/lib/notifications/telegram.ts`

- `sendTelegramMessage(chatId, text)`:
  - calls `POST https://api.telegram.org/bot<TOKEN>/sendMessage`
  - body includes `{"chat_id": "<chatId>", "text": "...", "parse_mode": "HTML"}`
- `sendTelegramMessageWithButton(chatId, text, buttonText, buttonUrl)`:
  - adds inline keyboard with URL button
  - button format: `{"inline_keyboard": [[{"text": "...", "url": "..."}]]}`

### High-level unified notifications

File: `src/lib/notifications/index.ts`

- `notifyBuyer(...)` and `notifyBuyerOfNewOffer(...)` route to Telegram or MAX based on buyer's platform

---

## 4) How the app gets `chat_id`

The system needs a valid `chat_id` to message a user.

Expected sources:

1. From Telegram WebApp init data:
   - `initDataUnsafe.chat.id` or `initDataUnsafe.user.id`
2. Stored in DB:
   - Prisma model: `Buyer.platformChatId` (falls back to `Buyer.platformUserId` if needed)

Inquiry creation endpoint updates it:

- `src/app/api/inquiries/route.ts`
  - upserts buyer by `(platform, platformUserId)`
  - updates `platformChatId` if request includes it

---

## 5) How to send a message (manual test triggers)

### Option A: Create a test script (recommended)

Create `scripts/test-telegram-notification.ts`:

```typescript
#!/usr/bin/env bun
import { sendTelegramMessage } from '../src/lib/notifications/telegram';

const [chatId, text = 'Test notification from AutoAuction'] = process.argv.slice(2);

if (!chatId) {
  console.error('Usage: bun run scripts/test-telegram-notification.ts <chat_id> [message]');
  process.exit(1);
}

const result = await sendTelegramMessage(chatId, text);

if (result.success) {
  console.log('✅ Message sent successfully');
} else {
  console.error('❌ Failed to send message:', result.error);
  process.exit(1);
}
```

Usage:

```bash
bun --env-file=.env.local run scripts/test-telegram-notification.ts <chat_id> "hello!"
```

### Option B: Debug API endpoint

Create `src/app/api/debug/telegram/send-test/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/notifications/telegram';

export async function POST(request: Request) {
  const { chatId, text } = await request.json();

  if (!chatId || !text) {
    return NextResponse.json({ error: 'chatId and text are required' }, { status: 400 });
  }

  const result = await sendTelegramMessage(chatId, text);

  if (result.success) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }
}
```

Then test with:

```bash
curl -X POST http://localhost:3000/api/debug/telegram/send-test \
  -H "Content-Type: application/json" \
  -d '{"chatId": "123456", "text": "Test message"}'
```

---

## 6) Environment variables

`.env.local` should contain:

```bash
TG_BOT_TOKEN="<your_bot_token_from_BotFather>"
TG_BOT_NAME="autoauction_bot"  # Your bot's username
NEXT_PUBLIC_TELEGRAM_BOT_NAME="autoauction_bot"  # For client-side links
```

### Getting these values:

1. **TG_BOT_TOKEN**: Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
   - Send `/newbot` to BotFather
   - Follow prompts to choose name and username
   - BotFather will give you the token

2. **TG_BOT_NAME**: The username you chose (without the `@` prefix)

3. **NEXT_PUBLIC_TELEGRAM_BOT_NAME**: Same as TG_BOT_NAME, but accessible client-side

---

## 7) Setting up the Telegram Mini App

### Step 1: Create the bot (if not done)

1. Open [@BotFather](https://t.me/BotFather)
2. Send `/newbot`
3. Choose a display name (e.g., "AutoAuction")
4. Choose a username (e.g., "autoauction_bot")
5. Copy the token to your `.env.local`

### Step 2: Configure the Mini App

**Critical**: The domain must be allowlisted in BotFather. The Bot API accepts any URL via `setChatMenuButton`, but Telegram clients silently refuse to show the button unless the domain was registered through BotFather first.

**Via BotFather (required for new domains):**

1. Send `/mybots` to BotFather
2. Select your bot
3. Choose "Bot Settings" → "Menu Button" → "Configure Menu Button"
4. Send the URL to your app:
   - Dev: `http://localhost:3000/app` (use ngrok for HTTPS)
   - Staging: `https://staging.svoauto.ru/app`
   - Production: `https://svoauto.ru/app`

**Via Script (after domain is allowlisted):**

```bash
# Set menu button via API (domain must already be allowlisted)
node scripts/setup-telegram-menu-button.js --env-file=.env.staging
```

### Step 3: Test the mini app

1. Open your bot in Telegram
2. You should see a button in the message input area (bottom of screen)
3. Click it to open your mini app

---

## 8) Getting a user's chat_id for testing

To find out your own Telegram chat_id for testing:

### Method 1: Use a bot

1. Message [@userinfobot](https://t.me/userinfobot)
2. It will reply with your chat ID

### Method 2: Check your app's database

After a user submits an inquiry:

```bash
bun --env-file=.env.local run scripts/show-buyers.ts
```

Look for the buyer record with `platform='TELEGRAM'` and note their `platformChatId`.

### Method 3: Use getUpdates API

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates"
```

This returns recent messages sent to your bot, including chat IDs.

---

## 9) Testing the flow end-to-end

### Prerequisites

1. Telegram bot is created and configured with BotFather
2. Mini app URL is set in bot settings
3. Environment variables are set in `.env.local`
4. Server is running: `bun dev`

### Test Steps

1. **Clear the database** (optional, for clean test):

```bash
curl -X POST http://localhost:3000/api/admin/clear-db
```

2. **Open the mini app**:
   - Open your bot in Telegram
   - Click the menu button to open mini app
   - Or use a deep link: `https://t.me/your_bot_name?startapp=inquiry`

3. **Submit an inquiry**:
   - Fill out the inquiry form
   - Submit it
   - This creates a Buyer record with your chat_id

4. **Verify the buyer was created**:

```bash
bun --env-file=.env.local run scripts/show-buyers.ts
```

You should see a buyer with:

- `platform: "TELEGRAM"`
- `platformChatId: "<your_chat_id>"`
- `platformUserId: "<your_user_id>"`

5. **Send a test notification**:

```bash
bun --env-file=.env.local run scripts/test-telegram-notification.ts <chat_id> "Тестовое уведомление!"
```

You should receive the message in Telegram from your bot.

6. **Test automatic notifications** (if implemented):
   - Create an inquiry as a buyer
   - Login as a dealer at `/dealer`
   - Make an offer on the inquiry
   - The buyer should receive a Telegram message about the new offer

---

## 10) Common issues and solutions

### "Forbidden: bot was blocked by the user"

**Problem**: User has blocked your bot.

**Solution**: Unblock the bot in Telegram and try again.

### "Bad Request: chat not found"

**Problem**: The chat_id is incorrect or the user hasn't started a conversation with your bot.

**Solution**:

- Make sure the user has opened the bot at least once
- Verify the chat_id is correct
- Check if you're using the right token

### "Unauthorized"

**Problem**: Invalid or missing bot token.

**Solution**:

- Check `TG_BOT_TOKEN` in `.env.local`
- Verify the token with BotFather using `/mybots`

### Mini app doesn't load

**Problem**: URL is not accessible or CORS issues.

**Solution**:

- For local development, use ngrok or a similar tunneling service
- Telegram requires HTTPS for mini apps (except localhost in Telegram Desktop)
- Check browser console for errors

---

## 11) Sending messages with buttons

### Simple URL button:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "123456",
    "text": "Check your inquiry status!",
    "reply_markup": {
      "inline_keyboard": [
        [
          {
            "text": "View Inquiry",
            "url": "https://t.me/your_bot?startapp=inquiry_abc123"
          }
        ]
      ]
    }
  }'
```

### Using the helper function:

```typescript
import { sendTelegramMessageWithButton } from '@/lib/notifications/telegram';

await sendTelegramMessageWithButton(
  chatId,
  'New offer received! Click to view.',
  'View Offers',
  `https://t.me/${process.env.TG_BOT_NAME}?startapp=inquiry_${inquiryId}`
);
```

---

## 12) Differences from MAX (quick reference)

| Feature       | MAX                              | Telegram                                      |
| ------------- | -------------------------------- | --------------------------------------------- |
| API Base      | `https://platform-api.max.ru`    | `https://api.telegram.org/bot<TOKEN>/`        |
| Auth          | Header: `Authorization: <token>` | URL path: `/bot<token>/`                      |
| chat_id       | Query param: `?chat_id=...`      | Body: `{"chat_id": "..."}`                    |
| Send endpoint | `/messages`                      | `/sendMessage`                                |
| Button type   | `link` in attachments            | `url` in inline_keyboard                      |
| Parse modes   | Not documented                   | `HTML`, `Markdown`, `MarkdownV2`              |
| WebApp init   | `WebApp.initDataUnsafe.chat.id`  | `WebApp.initDataUnsafe.user.id` or `.chat.id` |

---

## 13) Quick commands reference

Create test script:

```bash
# See "Option A" in section 5 above
bun --env-file=.env.local run scripts/test-telegram-notification.ts <chat_id> "test"
```

Show buyers:

```bash
bun --env-file=.env.local run scripts/show-buyers.ts
```

Clear database:

```bash
curl -X POST http://localhost:3000/api/admin/clear-db
```

Get updates from Telegram (see recent messages):

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates"
```

Test send via API:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "123456", "text": "Test"}'
```

---

## 14) Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Telegram WebApps Documentation](https://core.telegram.org/bots/webapps)
- [@BotFather](https://t.me/BotFather) - Create and manage bots
- [@userinfobot](https://t.me/userinfobot) - Get your chat_id
