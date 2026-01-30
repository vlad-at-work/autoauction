# MAX Bot API Setup Guide

## How MAX Bot Messaging Works

The MAX Platform Bot API allows you to send messages to users who have interacted with your bot.

### Key Concepts

1. **Bot Token**: Your bot's authentication token (stored in `MAX_BOT_TOKEN` env variable)
2. **Chat ID**: The unique identifier for each conversation between a user and your bot
3. **User ID**: The unique identifier for each MAX user

### Critical API Details

**The most important thing to understand**: Unlike most REST APIs, the MAX Bot API requires the recipient identifiers (`chat_id` or `user_id`) to be passed as **URL query parameters**, NOT in the JSON request body.

### Sending a Simple Message

```bash
curl -X POST \
  -H "Authorization: YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Your message here"}' \
  "https://platform-api.max.ru/messages?chat_id=CHAT_ID"
```

**Key points:**
- `chat_id` goes in the URL: `?chat_id=123456`
- Only the message content goes in the body: `{"text": "..."}`
- Authorization header is just the token (no "Bearer" prefix)

### Sending a Message with Button

```bash
curl -X POST \
  -H "Authorization: YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Click the button below",
    "attachments": [
      {
        "type": "inline_keyboard",
        "payload": {
          "buttons": [
            [
              {
                "type": "link",
                "text": "Open App",
                "url": "https://max.ru/YOUR_BOT_NAME?startapp=some_param"
              }
            ]
          ]
        }
      }
    ]
  }' \
  "https://platform-api.max.ru/messages?chat_id=CHAT_ID"
```

### Available Button Types

MAX supports these button types (NOT `open_app`):
- `link` - Opens a URL
- `callback` - Triggers a callback to your bot
- `request_contact` - Requests user's contact info
- `request_geo_location` - Requests user's location
- `chat` - Creates a chat

### Getting Chat IDs

Users' chat IDs are obtained when they interact with your mini-app. The WebApp SDK provides this in `WebApp.initDataUnsafe.chat.id`.

In our app:
1. User opens mini-app from MAX bot
2. WebApp SDK exposes their `chat.id`
3. We capture it when they submit the inquiry form
4. We store it in the `Buyer.platformChatId` field
5. We use it to send notifications later

### Environment Variables

```bash
MAX_BOT_TOKEN="your_bot_token_from_max_organization_cabinet"
MAX_BOT_NAME="your_bot_username"  # e.g., "id5010035001_bot"
```

### Testing

To test if your bot can send messages:

```bash
# 1. Get your bot info
curl -H "Authorization: YOUR_TOKEN" https://platform-api.max.ru/me

# 2. Send a test message (you need a valid chat_id from a user who started your bot)
curl -X POST \
  -H "Authorization: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test"}' \
  "https://platform-api.max.ru/messages?chat_id=CHAT_ID"
```

### Common Errors

**"Unknown recipient"** - This means:
- The `chat_id` is wrong
- OR you put `chat_id` in the body instead of the URL query params (this was our bug!)
- OR the user hasn't started a conversation with your bot yet

**"Field 'chat_id' is required"** - You forgot to add `?chat_id=...` to the URL

### Implementation in Code

See `src/lib/notifications/max.ts` for the working implementation:

```typescript
const url = new URL('https://platform-api.max.ru/messages');
url.searchParams.set('chat_id', chatId);  // Query param, not body!

const response = await fetch(url.toString(), {
  method: 'POST',
  headers: {
    Authorization: MAX_BOT_TOKEN,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ text }),  // Only message content in body
});
```

### Resources

- Official API: https://dev.max.ru/docs-api
- TypeScript Client: https://github.com/max-messenger/max-bot-api-client-ts
