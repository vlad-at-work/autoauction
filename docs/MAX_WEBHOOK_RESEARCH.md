# MAX Webhook & Message Sending - Current Status & Findings

## Official MAX API Documentation Reference
- **Source**: https://dev.max.ru/docs-api
- **Last Checked**: 2026-02-01

## Key Findings

### 1. Webhook Protocol Requirements
- **Only HTTPS supported** for webhook delivery
- **Self-signed certificates are allowed** (including for webhooks)
- Webhooks must respond with HTTP 200 OK quickly to avoid timeout disconnection

### 2. Message Sending API
- **Endpoint**: `POST https://platform-api.max.ru/messages`
- **Authentication**: `Authorization: <token>` header (no Bearer prefix, no query params)
- **Rate Limit**: 30 requests per second maximum on platform-api.max.ru
- **Response Format**: JSON objects
- **Retry Logic**: Standard HTTP codes (429 for rate limit, 503 for unavailability)

### 3. Bot Configuration in MAX Cabinet
- **Important**: As of Feb 2026, there is NO webhook configuration panel in the MAX business cabinet (business.max.ru)
- **Webhook setup**: Must be done programmatically via API call:
  ```
  POST https://platform-api.max.ru/subscriptions
  Headers: Authorization: <bot_token>
  Body: { "url": "https://yourdomain.com/webhook" }
  ```
- Verification: `GET https://platform-api.max.ru/subscriptions`

### 4. Development vs Production
- **For development/testing**: Use Long Polling (no webhook needed)
- **For production**: Webhooks are recommended

## Current Implementation Status

### What's Working
✅ Mini-app loads correctly
✅ Users can create inquiries and data persists
✅ Bot token is valid and stored correctly

### What's Not Working
❌ Message sending returns "Unknown recipient" error despite:
- Valid token
- Correct chat_id (user_id for private chats)
- Correct API endpoint
- Correct authorization header format

### Probable Root Causes
1. **Bot not activated for messaging** - May require webhook setup first OR explicit permission in cabinet
2. **Chat_id validation issue** - Possible mismatch between what we store and what MAX expects
3. **User consent missing** - User may need to perform specific action before bot can send unsolicited messages
4. **Outdated documentation** - MAX API may have changed; official docs at dev.max.ru might have latest requirements

## Recommended Next Steps

1. **Set up webhook endpoint** (`/api/webhooks/max`)
2. **Register webhook** via `POST /subscriptions` using bot token
3. **Implement `/start` command handler** in webhook to confirm bot activation
4. **Test message sending** after webhook is active
5. **Check MAX cabinet** for any "Message sending" permissions or approvals needed

## Related Files
- `src/lib/notifications/max.ts` - Current message sending implementation
- `docs/max_integration.txt` - Earlier research (Chinese documentation references)
- `docs/max_notification_issue.md` - Deep research on the "Unknown recipient" problem

## API Reference

### Get Bot Info
```
GET https://platform-api.max.ru/me
Headers: Authorization: <token>
```

### Register Webhook
```
POST https://platform-api.max.ru/subscriptions
Headers: Authorization: <token>
Body: { "url": "https://yourdomain.com/webhook" }
```

### Check Webhook Status
```
GET https://platform-api.max.ru/subscriptions
Headers: Authorization: <token>
```

### Send Message
```
POST https://platform-api.max.ru/messages?chat_id=<chat_id>
Headers: 
  Authorization: <token>
  Content-Type: application/json
Body: { "text": "message" }
```

---

**TODO**: Once webhook is set up and working, document the exact flow that fixed the "Unknown recipient" error for future reference.
