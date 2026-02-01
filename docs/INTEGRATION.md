# Platform Integration Guide (MAX + Telegram)

## Quick Reference

### Environment Variables
```bash
# Telegram
TG_BOT_TOKEN="123456:ABC..."
TG_WEBHOOK_SECRET="random_secret"
NEXT_PUBLIC_TELEGRAM_BOT_NAME="your_bot"

# MAX
MAX_BOT_TOKEN="your_token_from_max_cabinet"
MAX_BOT_NAME="YourBotName"
NEXT_PUBLIC_MAX_BOT_NAME="YourBotName"

# Dealer Portal
DEALER_CREDENTIALS="dealer1:pass1,dealer2:pass2"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="admin123"
```

---

## MAX Bot API

### Sending Messages

**Critical: chat_id goes in URL params, not body!**

```bash
curl -X POST \
  -H "Authorization: YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello"}' \
  "https://platform-api.max.ru/messages?chat_id=CHAT_ID"
```

### Sending Messages with Buttons

```bash
curl -X POST \
  -H "Authorization: YOUR_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Click below",
    "attachments": [{
      "type": "inline_keyboard",
      "payload": {
        "buttons": [[{
          "type": "link",
          "text": "Open App",
          "url": "https://max.ru/BOT_NAME?startapp=param"
        }]]
      }
    }]
  }' \
  "https://platform-api.max.ru/messages?chat_id=CHAT_ID"
```

**Button types:** `link`, `callback`, `request_contact`, `request_geo_location`, `chat`

### Webhook Setup

```bash
# Register
curl -X POST https://platform-api.max.ru/subscriptions \
  -H "Authorization: TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/api/webhooks/max"}'

# Check status
curl -H "Authorization: TOKEN" https://platform-api.max.ru/subscriptions

# Remove
curl -X DELETE -H "Authorization: TOKEN" https://platform-api.max.ru/subscriptions
```

---

## Telegram Bot API

### Sending Messages

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"chat_id": 123456, "text": "Hello"}' \
  "https://api.telegram.org/bot<TOKEN>/sendMessage"
```

### Sending Messages with WebApp Button

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": 123456,
    "text": "Click below",
    "reply_markup": {
      "inline_keyboard": [[{
        "text": "Open App",
        "web_app": {"url": "https://your-app.com/app?startapp=param"}
      }]]
    }
  }' \
  "https://api.telegram.org/bot<TOKEN>/sendMessage"
```

### Webhook Setup

```bash
# Register
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/api/webhooks/telegram", "secret_token": "SECRET"}'

# Check status
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# Remove
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook -d '{"url": ""}'
```

---

## WebApp Authentication

### Client-Side Detection

```typescript
// Detect platform
function detectPlatform() {
  if (window.Telegram?.WebApp?.initData) return 'telegram';
  if (window.WebApp?.initData) return 'max';
  return null;
}

// Get user ID
function getUserId() {
  const tg = window.Telegram?.WebApp;
  const max = window.WebApp;
  return tg?.initDataUnsafe?.user?.id || max?.initDataUnsafe?.user?.id;
}
```

### Server-Side Signature Verification

**Telegram:**
```typescript
import crypto from 'crypto';

function verifyTelegram(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  
  const dataStr = [...params.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  
  const secret = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secret).update(dataStr).digest('hex');
  
  return hmac === hash;
}
```

**MAX:**
```typescript
function verifyMax(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');
  
  const dataStr = [...params.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  
  const secret = crypto.createHmac('sha256', 'WebAppData' + botToken).update('').digest();
  const hmac = crypto.createHmac('sha256', secret).update(dataStr).digest('hex');
  
  return hmac === hash;
}
```

---

## Deep Links

### Format

```
Telegram: https://t.me/BOT_NAME?startapp=PARAM
MAX: https://max.ru/BOT_NAME?startapp=PARAM
```

### Reading startapp Parameter

```typescript
// In mini-app
const initDataUnsafe = webApp?.initDataUnsafe;
const startParam = 
  initDataUnsafe?.tgWebAppStartParam ||  // Telegram
  initDataUnsafe?.startapp ||            // MAX
  new URLSearchParams(location.search).get('startapp');  // Fallback

// Parse: "context:resourceId"
const [context, resourceId] = startParam?.split(':') || [];
```

---

## Code Locations

| Feature | File |
|---------|------|
| MAX notification sending | `src/lib/notifications/max.ts` |
| Telegram notification sending | `src/lib/notifications/telegram.ts` |
| Notification orchestration | `src/lib/notifications/index.ts` |
| Deep link generation | `src/lib/deeplinks.ts` |
| WebApp detection | `src/app/app/webapp-ready.ts` |
| Auth validation | `src/lib/auth/webapp-validation.ts` |
| MAX webhook | `src/app/api/webhooks/max/route.ts` |
| Telegram webhook | `src/app/api/webhooks/telegram/route.ts` |

---

## Common Issues

### MAX "Unknown recipient"
- Ensure chat_id is in URL params, not body
- User must have opened bot/mini-app first
- Webhook must be registered

### Telegram button not navigating
- Check startapp is in URL query params
- App must read from URLSearchParams as fallback

### Signature verification failing
- Check auth_date freshness (max 5 min)
- Telegram: use SHA256(token) as secret
- MAX: use HMAC("WebAppData" + token) as secret
