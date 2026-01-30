# MAX: send a text message with the bot token (very simple)

## What you need

- **Token** (`MAX_BOT_TOKEN`) = your bot’s “password” for the MAX Platform API
- **Chat ID** (`chat_id`) = the “address” of the conversation to deliver into

## Where to get `chat_id`

- In the mini-app UI:
  - `/app/dashboard` shows **Debug: Chat ID**
  - `/app/debug-info` shows **Chat ID**
- Or from DB via script:
  - `bun --env-file=.env.local run scripts/show-buyers.ts`

## The one request that sends text

- Endpoint:
  - `POST https://platform-api.max.ru/messages?chat_id=CHAT_ID`
- Headers:
  - `Authorization: MAX_BOT_TOKEN`
  - `Content-Type: application/json`
- Body:
  - `{ "text": "hello! 999!" }`

### Curl example

```bash
curl -X POST \
  -H "Authorization: $MAX_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"hello! 999!"}' \
  "https://platform-api.max.ru/messages?chat_id=CHAT_ID"
```

### Bun script example (this repo)

```bash
bun --env-file=.env.local run scripts/test-max-notification.ts CHAT_ID "hello! 999!"
```

## Common mistakes

- Using `user.id` instead of `initDataUnsafe.chat.id` (MAX can differ; use the chat id).
- Putting `chat_id` in JSON body instead of the URL query string.
- Trying to message a user who hasn’t started a chat with the bot.

## Security note

- Treat `MAX_BOT_TOKEN` like a password: don’t paste it into chats/screenshots or commit it to git.

