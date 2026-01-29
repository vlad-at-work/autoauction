# MAX Bot Notification Issue - Deep Research Request

## Context

We have a Next.js 16 web application (AutoAuction) deployed on Vercel that works as a mini-app inside the MAX messenger (Russian messenger platform). The mini-app is successfully linked to a MAX bot and users can open it, but we **cannot send notifications** from our server to users via the MAX Bot API.

## What We Have Working

1. **MAX Bot Registration**: 
   - We have a verified organization account with MAX
   - Bot is created and approved
   - Bot ID: `id5010035001_bot` (also referenced as "Test" in the app)
   - Bot token available: `f9LHodD0cOKWkXKjZFUXd21RZnvs0pJ0MFiDtpXgedyG_EsdPx8JbI5g-m0N5NXjntrJcEJ0NdR_wU70xBY-`

2. **Mini-App Integration**:
   - Mini-app URL: `https://autoauction-two.vercel.app/app`
   - Successfully embedded in the bot (users see a button to open it)
   - WebApp SDK loads correctly (`https://st.max.ru/js/max-web-app.js`)
   - We can read user data via `window.WebApp.initDataUnsafe`
   - User can create inquiries and data persists in our database

3. **User Flow That Works**:
   - User opens MAX app on phone
   - User searches for bot by name: `id5010035001_bot`
   - Bot appears in search results as "Test"
   - User opens bot chat → sees the embedded mini-app button
   - User clicks button → mini-app opens in WebView
   - User creates inquiry → data saved to PostgreSQL database
   - User returns to dashboard → sees their inquiries
   - **Bot remains in user's chat list** (this is important - the chat exists)

4. **Data We Have**:
   - User's MAX user ID: `20325912`
   - User's chat ID with bot: `20325912` (we assume chat_id = user_id for private chats)
   - Database record created with `platform: 'MAX'`, `platformUserId: '20325912'`, `platformChatId: '20325912'`

## What Doesn't Work

**Sending notifications to the user fails with "Unknown recipient" error.**

### API Call We're Making

```bash
curl -X POST https://platform-api.max.ru/messages \
  -H "Authorization: f9LHodD0cOKWkXKjZFUXd21RZnvs0pJ0MFiDtpXgedyG_EsdPx8JbI5g-m0N5NXjntrJcEJ0NdR_wU70xBY-" \
  -H "Content-Type: application/json" \
  -d '{"chat_id":20325912,"text":"Тест! 🚗"}'
```

### Response

```json
{
  "code": "proto.payload",
  "message": "Unknown recipient"
}
```

### What We've Tried

1. ✅ **Verified bot token is correct** - copied directly from Vercel environment variables where it's stored from MAX organization cabinet
2. ✅ **Confirmed user has active chat with bot** - the bot appears in their chat list, they can open the mini-app
3. ✅ **Sent `/start` command from user** - user typed `/start` in bot chat, but bot didn't respond (no echo, no acknowledgment)
4. ✅ **Used correct chat_id** - tried user_id (20325912) which should equal chat_id in private chats
5. ✅ **Correct API endpoint** - using `https://platform-api.max.ru/messages` as documented
6. ✅ **Correct authorization header** - sending token in `Authorization` header, not in URL
7. ✅ **Integer chat_id** - sending as number (20325912), not string
8. ❌ **Webhook setup** - we haven't set up a webhook for incoming messages (not sure if required for sending)

## Technical Details

### Our Implementation

**Notification service** (`src/lib/notifications/max.ts`):
```typescript
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_API_BASE = 'https://platform-api.max.ru';

export async function sendMaxMessage(chatId: string, text: string) {
  const response = await fetch(`${MAX_API_BASE}/messages`, {
    method: 'POST',
    headers: {
      Authorization: MAX_BOT_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: parseInt(chatId, 10),
      text,
    }),
  });
  
  // Returns 400: "Unknown recipient"
}
```

**Trigger point** (`src/app/api/offers/route.ts`):
When dealer creates an offer, we call:
```typescript
await notifyBuyerOfNewOffer(
  inquiry.buyer, // { platform: 'MAX', platformUserId: '20325912', platformChatId: '20325912' }
  inquiryId,
  offerId,
  inquiry.model,
  inquiry.submodel,
  price
);
```

### Reference Documentation

We're following the documentation from `max_integration.txt` which states:

```
POST https://platform-api.max.ru/messages
Headers: { Authorization: <token>, Content-Type: application/json }
Body: { "chat_id": <число>, "text": "Текст" }
```

The documentation mentions:
- "После регистрации чат-бота в кабинете организации платформа выдаёт токен"
- "Токен даёт права на отправку сообщений"
- "Пользователь должен иметь открытый диалог с ботом"

## Questions for Deep Research

### Primary Questions

1. **What does "Unknown recipient" error mean in MAX Bot API context?**
   - Does it mean the bot isn't activated for messaging?
   - Does it mean the user hasn't "started" the bot properly?
   - Does it mean we're missing a permission/scope in the bot configuration?

2. **What is required to enable bot-to-user messaging in MAX?**
   - Is there a specific setting in the organization cabinet we need to enable?
   - Do we need to register a webhook first before we can send messages?
   - Is there a bot approval/moderation process for messaging capabilities separate from mini-app approval?

3. **How does the "start" flow work in MAX?**
   - When user opens the mini-app (not by typing /start), does that count as "starting" the bot?
   - Do we need to implement a /start command handler?
   - Is there a difference between "bot in chat list" and "bot activated for messaging"?

4. **Is our API call format correct?**
   - Should `Authorization` header have a prefix like `Bearer` or `Bot`?
   - Should `chat_id` be sent as string or integer?
   - Are there additional required fields we're missing?

5. **Do we need to set up webhooks to send messages?**
   - MAX docs mention `POST /subscriptions` to register webhook
   - Is this only for receiving messages, or does it enable sending too?
   - Could the bot be in a "receive-only" mode without webhook setup?

### Secondary Questions

6. **How do we verify the bot has messaging permissions?**
   - Is there an API endpoint to check bot status/capabilities?
   - GET /me endpoint exists - what does it return?

7. **Could the chat_id be different from user_id?**
   - Documentation suggests they're the same for private chats
   - Is there a way to get the actual chat_id from the WebApp data?
   - Should we be using `initDataUnsafe.chat.id` explicitly?

8. **Does the bot need to send a message first?**
   - Does MAX require the bot to initiate conversation before user can receive messages?
   - Or can we send unprompted messages after user opens mini-app?

9. **Are there rate limits or quotas that could cause this error?**
   - Documentation mentions 30 requests/second limit
   - Could there be a daily message quota we've hit (seems unlikely for first test)?

10. **Is there a sandbox/test mode vs production mode issue?**
    - Could the bot be in test mode where messaging is disabled?
    - Is there a production activation step we're missing?

## What We Need

We need to find out:
1. **The exact steps** to configure a MAX bot to send messages to users
2. **The exact API call format** that works (with working example if possible)
3. **Any prerequisites** (webhook setup, permissions, approvals) we're missing
4. **How to debug** this issue (is there a MAX Bot API test tool or logs we can check?)

## Additional Context

- **Platform**: MAX messenger (Russian platform, similar to Telegram)
- **Organization**: We have a verified organization account with юридическое лицо
- **Bot Type**: Chat bot with mini-app attached
- **Mini-app Framework**: Next.js 16 on Vercel
- **User Count**: Testing with 1 real user (ourselves)
- **Deployment**: Production environment on Vercel

## Reference Links

- MAX Bot API documentation: mentioned but not publicly accessible
- Platform API base URL: `https://platform-api.max.ru`
- Previous MAX API base: `botapi.max.ru` (deprecated in 2025)
- MAX organization cabinet: Where we registered the bot (exact URL not documented)

## Expected Behavior

When we call the API to send a message, we should either:
- **Success**: Receive 200 OK and user sees message in their bot chat
- **Clear error**: Get a specific error telling us what permission/setup is missing

Instead we get a generic "Unknown recipient" which doesn't indicate what needs to be fixed.

---

**Please research:**
1. MAX Bot API documentation and best practices
2. Common reasons for "Unknown recipient" error
3. Required configuration steps in MAX organization cabinet
4. Working examples of MAX bot notification implementation
5. Differences between mini-app integration and bot messaging permissions
