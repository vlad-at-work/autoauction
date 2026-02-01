# MAX Bot Integration & Mini-App Development Guide

**Status:** Complete technical reference based on research as of February 2026  
**Languages:** MAX API operates in Russian; examples bilingual  
**Scope:** Authentication, message sending, webhook setup, security validation

---

## 1. Platform Overview: MAX vs Telegram

### Authentication & Tokens

**MAX:**
- Bot token provided by business.max.ru after registration (requires verified Russian organization)
- Token passed ONLY via `Authorization: <token>` header (no URL parameters, no Bearer prefix)
- Updated August 2025: query-parameter tokens no longer accepted
- Same token used for both Bot API calls and WebApp signature verification

**Telegram:**
- Token from @BotFather (format: `123456:ABC-...`)
- Can be in URL: `https://api.telegram.org/bot<Token>/method`
- Or passed as header (for webhooks)
- Same token used for signature verification

### User & Chat Identification

**MAX:**
- Each user has unique `user.id` (64-bit integer)
- In WebApp: `window.WebApp.initDataUnsafe.user.id`
- Each chat has `chat.id` (in private dialogs, usually equals user.id)
- To send messages: use `chat_id` from `initDataUnsafe.chat.id`
- **Critical:** User must have active dialog with bot (clicked button/opened mini-app) before bot can send unsolicited messages

**Telegram:**
- Each user has global `id` (integer)
- In WebApp: `window.Telegram.WebApp.initDataUnsafe.user.id`
- For private chats: `chat_id = user.id`
- **Critical:** User must explicitly press "Start" button before bot can send messages
- Bot cannot initiate contact; user must engage first

### WebApp Data Transmission

**MAX:**
- Passes `WebAppData` object with `initData` (URL-encoded) and `hash`
- Access via: `WebApp.initDataUnsafe` (unsafe, unvalidated)
- Signature verification uses: `HMAC_SHA256("WebAppData" + BotToken)`
- Must validate on server before trusting any data

**Telegram:**
- Passes `initData` (URL-encoded) with `hash` and `auth_date`
- Access via: `Telegram.WebApp.initDataUnsafe`
- Signature verification uses: `HMAC_SHA256(SHA256(BotToken))`
- Must validate on server; also check `auth_date` freshness (reject >5-10 min old)

---

## 2. Message Sending API

### MAX Message Endpoint

**URL:** `POST https://platform-api.max.ru/messages`

**Headers:**
```
Authorization: <token>
Content-Type: application/json
```

**Body:**
```json
{
  "chat_id": 12345678,
  "text": "Привет, пользователь!",
  "parse_mode": "HTML" // or "Markdown"
}
```

**Rate Limits:**
- 30 requests/second maximum across all bots
- No documented hourly limits, but respect reasonable intervals
- Rate limit error: HTTP 429

**Common Errors:**
- `400 Bad Request` - Invalid chat_id or format
- `403 Forbidden` - Chat not accessible (user deleted bot)
- `Unknown recipient` - **Root cause being investigated** - possible causes:
  - Bot not activated for messaging (may need webhook first)
  - chat_id validation mismatch between stored and MAX's expectations
  - User hasn't explicitly opened mini-app or sent message to bot
  - Outdated documentation - check dev.max.ru for latest

**Response on Success:**
```json
{
  "ok": true,
  "result": {
    "message_id": 1234,
    "chat": { "id": 12345678 },
    "text": "Привет, пользователь!",
    "date": 1706806800
  }
}
```

### Telegram Message Endpoint

**URL:** `POST https://api.telegram.org/bot<Token>/sendMessage`

**Body:**
```json
{
  "chat_id": 123456789,
  "text": "Hello, user!",
  "parse_mode": "HTML"
}
```

**Rate Limits:**
- ~30 messages/second globally
- ~20 messages/minute per chat
- Exceeded = `429 Too Many Requests`

**Common Errors:**
- `403 Forbidden: bot was blocked by the user` - User blocked bot (remove from DB)
- `400 Bad Request` - Invalid chat_id or message format
- `429 Too Many Requests` - Rate limit exceeded (back off and retry)

---

## 3. Webhook Registration & Event Handling

### MAX Webhook Setup

**Register webhook:**
```bash
curl -X POST https://platform-api.max.ru/subscriptions \
  -H "Authorization: <token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/webhook/max"}'
```

**Verify webhook:**
```bash
curl -X GET https://platform-api.max.ru/subscriptions \
  -H "Authorization: <token>"
```

**Unregister (if needed):**
```bash
curl -X DELETE https://platform-api.max.ru/subscriptions \
  -H "Authorization: <token>"
```

**Event types MAX sends:**
- `message_new` - User sent message to bot
- `message_callback` - User clicked inline button
- `message_event` - Mini-app opened (possibly)
- Others documented at dev.max.ru

**Example message_new event:**
```json
{
  "type": "message_new",
  "object": {
    "message": {
      "message_id": 1234,
      "from": { "user_id": 67890, "first_name": "Ivan" },
      "chat": { "chat_id": 67890 },
      "text": "/start",
      "date": 1706806800
    }
  }
}
```

**Server response requirement:** HTTP 200 OK within timeout (2-3 seconds)

### Telegram Webhook Setup

**Register webhook:**
```bash
curl -X POST https://api.telegram.org/bot<Token>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/webhook/tg",
    "secret_token": "MySecret123"
  }'
```

**Verify webhook:**
```bash
curl -X GET https://api.telegram.org/bot<Token>/getWebhookInfo
```

**Unregister:**
```bash
curl -X POST https://api.telegram.org/bot<Token>/setWebhook \
  -d '{"url": ""}'
```

**Event types Telegram sends (in updates):**
- `message` - User message
- `callback_query` - User clicked inline button
- `web_app_data` - Data from WebApp (if using sendData)
- `my_chat_member` - Bot added/removed from chat

**Example message event:**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 42,
    "from": { "id": 123456789, "first_name": "John", "username": "johndoe" },
    "chat": { "id": 123456789, "type": "private" },
    "date": 1706806800,
    "text": "/start"
  }
}
```

**Server response requirement:** HTTP 200 OK (can be empty body)

### Key Differences

| Aspect | MAX | Telegram |
|--------|-----|----------|
| Webhook auth | IP/User-Agent (limited) | `X-Telegram-Bot-Api-Secret-Token` header ✓ |
| Timeout tolerance | 2-3 sec | More lenient |
| Auto-retry | Yes | Yes |
| Max event size | Not documented | ~1MB |

---

## 4. WebApp Authentication & Signature Verification

### MAX Signature Verification (Server-side)

**Algorithm:**
1. Collect all `initData` parameters except `hash` itself
2. Sort by key alphabetically
3. Join with `\n` separator
4. Calculate: `secret = HMAC_SHA256("WebAppData" + BotToken)`
5. Calculate: `my_hash = HMAC_SHA256(secret, data_string)` 
6. Compare `hex(my_hash)` with received `hash`

**JavaScript Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifyMaxData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  
  // Sort and join
  const dataStr = [...params.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  
  // Create secret and verify
  const secret = crypto.createHmac('sha256', 'WebAppData' + botToken)
    .update('')
    .digest();
  
  const hmac = crypto.createHmac('sha256', secret)
    .update(dataStr)
    .digest('hex');
  
  return hmac === hash;
}
```

### Telegram Signature Verification

**Algorithm:**
1. Collect all `initData` parameters except `hash`
2. Sort by key alphabetically
3. Join with `\n` separator
4. Calculate: `secret = SHA256(BotToken)`
5. Calculate: `my_hash = HMAC_SHA256(secret, data_string)`
6. Compare `hex(my_hash)` with received `hash`

**JavaScript Example:**
```javascript
const crypto = require('crypto');

function verifyTelegramData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  
  const dataStr = [...params.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret)
    .update(dataStr)
    .digest('hex');
  
  return hmac === hash;
}
```

### Additional Security Checks

- **MAX:** No documented auth_date - check timestamp on server side if you include it
- **Telegram:** Check `auth_date` is within 5-10 minutes of current time
- **Both:** Never trust `initDataUnsafe` on client; always send `initData` to server for verification

---

## 5. Implementation Architecture

### End-to-End Flow

```
[Lander/Website]
    ↓
    └→ Deep link: https://max.ru/bot_name?startapp=state
    └→ Or: https://t.me/bot_username?startapp=state
    
[Messenger (MAX/Telegram)]
    ↓
    └→ User clicks button or link
    └→ Opens mini-app WebView
    
[Mini-App]
    ↓
    └→ JS loads WebApp object
    └→ Extract initData + user info
    └→ Send initData to backend
    
[Backend]
    ↓
    ├→ Verify signature
    ├→ Check auth_date freshness
    ├→ Create/fetch user account
    ├→ Save messenger_link (user ↔ bot)
    ├→ Return session/JWT
    └→ Store chat_id for future notifications
    
[Mini-App receives auth]
    ↓
    └→ Show main UI
    └→ Optional: "Enable notifications" toggle
    
[User toggles notifications]
    ↓
    └→ Frontend: POST /notify/enable
    └→ Backend: Update messenger_link.is_notifications_enabled
    └→ Backend: Send test message via Bot API
    
[User sees test message in messenger]
    ↓
    └→ Confirms bot is working
    
[Later: App events trigger notifications]
    ↓
    └→ Backend calls POST /messages (MAX) or sendMessage (TG)
    └→ User receives message in messenger
```

### Database Schema

```sql
-- Users table (your application)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR,
  phone VARCHAR,
  name VARCHAR,
  created_at TIMESTAMP
);

-- Messenger links (user ↔ bot mapping)
CREATE TABLE messenger_links (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  provider VARCHAR, -- "MAX" or "TELEGRAM"
  provider_user_id BIGINT, -- user.id from messenger
  chat_id BIGINT, -- chat_id for sending messages
  username VARCHAR, -- @username or MAX name
  is_notifications_enabled BOOLEAN DEFAULT FALSE,
  auth_date TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(user_id, provider)
);
```

---

## 6. Current Issues & Workarounds

### MAX "Unknown Recipient" Error

**Status:** Under investigation  
**Affects:** Message sending (POST /messages returns error)

**Probable causes:**
1. Bot not activated for messaging (requires webhook setup first)
2. Chat_id mismatch - stored value doesn't match MAX's internal mapping
3. User hasn't explicitly opened mini-app or sent message to bot first
4. Documentation outdated - check dev.max.ru for latest

**Workarounds being tested:**
1. Set up webhook FIRST before attempting message sends
2. Implement `/start` command handler to confirm bot activation
3. Explicitly store chat.id from initDataUnsafe (don't assume it equals user.id)
4. Ensure user performs explicit action before bot sends unsolicited messages

**Resolution path:**
- [ ] Set up webhook endpoint (/webhook/max)
- [ ] Register webhook via POST /subscriptions
- [ ] Handle /start command and log chat_id
- [ ] Test message send after webhook active
- [ ] Check dev.max.ru for API updates
- [ ] Document exact fix for future reference

---

## 7. Implementation Checklist (MVP)

### Phase 1: Infrastructure
- [ ] Register MAX bot (through business.max.ru or @MasterBot)
- [ ] Register Telegram bot (@BotFather)
- [ ] Obtain tokens (store in .env, never commit)
- [ ] Set up HTTPS endpoint accessible from internet
- [ ] Configure mini-app URL in both bot settings

### Phase 2: Webhook Setup
- [ ] Create `/webhook/max` endpoint
- [ ] Create `/webhook/tg` endpoint
- [ ] Register MAX webhook via POST /subscriptions
- [ ] Register Telegram webhook via setWebhook
- [ ] Verify webhooks active (GET /subscriptions, getWebhookInfo)

### Phase 3: Mini-App Development
- [ ] Create web app (React, HTML/JS, etc.)
- [ ] Include `max-web-app.js` script
- [ ] Include `telegram-web-app.js` script
- [ ] Extract `initData` from respective objects
- [ ] Send initData to backend for verification
- [ ] Display user info (first_name, username)
- [ ] Implement auth flow

### Phase 4: Backend Auth
- [ ] Implement MAX signature verification
- [ ] Implement Telegram signature verification
- [ ] Create user on first login
- [ ] Store messenger_link
- [ ] Return session/JWT token
- [ ] Handle existing user login

### Phase 5: Notifications
- [ ] Create `/notify/enable` endpoint
- [ ] Implement notification toggle in UI
- [ ] Send test message on enable
- [ ] Log incoming messages in webhook
- [ ] Test full notification flow

### Phase 6: Data Compliance
- [ ] Document where user data is stored
- [ ] Plan migration to Russian server if required (152-ФЗ compliance)
- [ ] Implement privacy policy in mini-app
- [ ] Implement terms of service in mini-app
- [ ] Plan for Telegram/MAX moderation review

---

## 8. Security Best Practices

### Token Management
- **DO:** Store tokens in environment variables (.env)
- **DO:** Use tokens only on backend (never expose in client code)
- **DO NOT:** Commit tokens to git
- **DO NOT:** Hardcode tokens in code
- **DO NOT:** Log tokens to stdout

### Signature Verification
- **ALWAYS:** Verify signatures on server before trusting data
- **CHECK:** auth_date freshness (reject >5-10 min old)
- **USE:** HMAC-SHA256 for verification (not SHA256 alone)
- **MAX:** Use "WebAppData" prefix in secret calculation (not just token)

### Session Management
- **USE:** SameSite=None; Secure for cookies in WebView
- **IMPLEMENT:** CSRF tokens if using POST forms
- **CHECK:** Origin/Referer headers on sensitive endpoints
- **CONSIDER:** One-time nonce per session

### Data Transmission
- **REQUIRE:** HTTPS for all communication
- **VALIDATE:** All user input from chat messages
- **SANITIZE:** HTML content before displaying
- **RATE-LIMIT:** Authentication endpoints (prevent brute force)

---

## 9. Testing Checklist

### Local Development
- [ ] ngrok or similar for HTTPS tunnel
- [ ] Test webhook registration/unregistration
- [ ] Send test message via curl
- [ ] Verify signature validation locally
- [ ] Load mini-app in test messenger client

### Bot Testing
- [ ] Send message to bot (triggers /webhook endpoint)
- [ ] Click buttons/callbacks (if implemented)
- [ ] Open mini-app from bot
- [ ] Test all auth flows

### Integration Testing
- [ ] Message send succeeds
- [ ] Message send fails gracefully
- [ ] User data persists
- [ ] Notifications work end-to-end
- [ ] Rate limits respected

### User Acceptance
- [ ] Bot approval from MAX/Telegram
- [ ] Privacy policy compliance
- [ ] Terms of service displayed
- [ ] Explicit opt-in for notifications
- [ ] Unsubscribe/block handling

---

## 10. Useful API Methods Reference

### MAX
```
GET /me - Get bot info
GET /subscriptions - Check webhook status
POST /subscriptions - Register webhook
DELETE /subscriptions - Unregister webhook
POST /messages - Send message
POST /upload - Upload file
```

### Telegram
```
GET /getMe - Get bot info
POST /setWebhook - Register webhook
GET /getWebhookInfo - Check webhook status
POST /sendMessage - Send message
POST /sendPhoto - Send image
POST /getUpdates - Poll for updates
POST /setBotMenuButton - Set main menu
POST /setBotDefaultAdministratorRights - Admin permissions
```

---

## References

- **MAX Docs:** https://dev.max.ru/docs-api
- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Telegram Mini Apps:** https://core.telegram.org/bots/webapps
- **Last Updated:** February 2026
- **Status:** Complete technical reference with known issues noted

---

**Next Steps:**
1. Register bots with platforms
2. Deploy HTTPS endpoint
3. Implement webhook handlers
4. Build mini-app with signature verification
5. Test message sending
6. Deploy to production (Russian server for data storage)
