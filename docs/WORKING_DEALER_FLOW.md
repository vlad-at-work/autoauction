# Working Dealer Flow (Feb 13, 2025)

## Current Status

All webhooks registered and active:

- MAX Customer Bot: ✅ Active
- MAX Dealer Bot: ✅ Active
- Telegram Customer Bot: ✅ Active
- Telegram Dealer Bot: ✅ Active

## Flow Architecture

### MAX Platform Constraints (Critical)

1. Chat starts in **SUSPENDED** state - bot CANNOT message first
2. User MUST send `/start` command
3. Webhook receives `bot_started` event with `start_payload`
4. Bot CAN now reply with welcome message
5. Chat moves to ACTIVE state

### Working Flow

```
Step 1: Admin creates dealer
  → Admin panel → Create dealer → Generate invite link
  → Link: https://max.ru/BOT?start=setup_dealerId_token

Step 2: Dealer clicks link
  → MAX opens chat with bot
  → Chat is in SUSPENDED state
  → Bot cannot message yet!

Step 3: Dealer sends /start
  → Types "/start" or clicks "Start" button
  → MAX sends webhook: bot_started event
  → Payload: { user_id, start_payload: "setup_dealerId_token" }

Step 4: Bot sends welcome message
  → POST /messages?user_id={user_id}
  → Text: "👋 Welcome! Click to activate:"
  → Button: [🚀 Activate Account] (type: open_app, payload: setup_dealerId_token)

Step 5: Dealer clicks button
  → Mini-app opens
  → initDataUnsafe.start_param = "setup_dealerId_token"
  → URL: /dealerinterface?startapp=setup_dealerId_token

Step 6: Setup password
  → App detects token → /setup page
  → Dealer enters password
  → POST /api/dealer/auth/setup
  → Dealer bound to MAX user_id
  → passwordHash saved

Step 7: Dashboard
  → Redirect to /dealerinterface/inquiries
  → Empty list (no inquiries yet)
  → Chat stays in dealer's MAX chat list
```

## Test Checklist

### Pre-test Setup

- [ ] Open admin panel: https://autoauction-two.vercel.app/admin
- [ ] Login with admin credentials

### Test Steps

1. **Create Dealer**
   - Go to /admin/dealers/new
   - Fill: username, name, phone, email
   - Submit
   - Note the dealer ID

2. **Generate Invite Link**
   - Open dealer detail page
   - Click "Generate Invite Link"
   - Copy the MAX URL

3. **Open in MAX (Phone)**
   - Send the link to yourself (Telegram/WhatsApp)
   - Click link on phone
   - MAX opens chat with dealer bot
   - **Expected**: Empty chat, no messages yet

4. **Send /start**
   - Type "/start" and send
   - **Expected**: Bot replies within 2-3 seconds
   - Message: "👋 Welcome! Click to activate:"
   - Button: "🚀 Activate Account"

5. **Click Activate Button**
   - Click the button
   - Mini-app opens
   - **Expected**: Setup page with password fields

6. **Set Password**
   - Enter password (min 8 chars)
   - Confirm password
   - Click Continue
   - **Expected**: Redirect to inquiries page

7. **Verify Dashboard**
   - See "Active Inquiries" (empty is OK)
   - See "Previous Inquiries" (empty is OK)

8. **Verify Chat Persistence**
   - Close mini-app (X button)
   - Go back to MAX main screen
   - **Expected**: Chat with dealer bot visible in list

### Troubleshooting

| Issue                           | Solution                                       |
| ------------------------------- | ---------------------------------------------- |
| No welcome message after /start | Check Vercel logs for webhook errors           |
| "Not Registered" in app         | Invite token not detected - use manual entry   |
| "Invalid credentials"           | Wrong password - use forgot password flow      |
| Chat disappears after close     | Bot welcome message wasn't sent - check step 4 |

## API Endpoints

### Webhook

- `POST /api/webhooks/max?bot=dealer`
- Handles: bot_started, message_created
- Sends welcome messages

### Auth

- `POST /api/dealer/auth/check` - Check auth status
- `POST /api/dealer/auth/setup` - Set password (first time)
- `POST /api/dealer/auth/login` - Login with password

### Data

- `GET /api/dealer/inquiries` - List inquiries

## Key Files

- `/src/app/api/webhooks/max/route.ts` - Webhook handler
- `/src/lib/notifications/max.ts` - Send messages
- `/src/app/dealerinterface/page.tsx` - Entry point
- `/src/app/dealerinterface/setup/page.tsx` - Password setup
- `/src/app/dealerinterface/inquiries/page.tsx` - Dashboard
