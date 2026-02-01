# Testing Instructions - Phone & Browser Testing Guide

**Status:** Complete reverse auction platform with Telegram and MAX bot integration ready for testing

---

## Prerequisites

### 1. Start the Development Server
```bash
source ~/.nvm/nvm.sh && nvm use 20
bun run dev
```

Server will run at: `http://localhost:3000`

### 2. Set Up ngrok for HTTPS Tunneling (for webhooks)
```bash
ngrok http 3000
```

Copy the generated URL (e.g., `https://abc123.ngrok.io`) - you'll need this for webhook testing.

### 3. Configure Environment Variables

Add to `.env.local`:
```bash
# Telegram
TG_BOT_TOKEN=<from_@BotFather>
TG_WEBHOOK_SECRET=test_secret_123

# MAX  
MAX_BOT_TOKEN=<from_MAX_cabinet>
MAX_WEBHOOK_SECRET=max_secret_456

# Webhooks
WEBHOOK_TELEGRAM_URL=https://your-ngrok-url.ngrok.io/api/webhooks/telegram
WEBHOOK_MAX_URL=https://your-ngrok-url.ngrok.io/api/webhooks/max
```

---

## Testing Flow 1: Web Browser (Buyer Flow)

### Test 1.1: Create an Inquiry
1. Open browser: `http://localhost:3000/app/form`
2. Fill form:
   - Name: "Test Buyer"
   - Phone: "+79991234567"
   - Email: "test@example.com"
   - Model: "Land Cruiser 250"
   - Submodel: "First Edition"
   - Transmission: "Автомат"
   - Color: "Белый"
3. Click "Создать заявку"
4. **Expected:** 
   - ✅ Inquiry created successfully
   - ✅ Redirected to dashboard
   - ✅ See "Осталось заявок: 1 из 2"
   - ✅ Inquiry visible with color tag

### Test 1.2: Try Creating Second Inquiry
1. Click "Создать новую заявку" 
2. Fill form again (same data, can change model)
3. Click "Создать заявку"
4. **Expected:**
   - ✅ Success
   - ✅ Dashboard shows "Осталось заявок: 0 из 2"

### Test 1.3: Try Creating Third Inquiry (Should Fail)
1. Click "Создать новую заявку"
2. Fill form
3. Click "Создать заявку"
4. **Expected:**
   - ❌ Error message: "Вы исчерпали лимит заявок (2 в месяц)"
   - ❌ Shows "Новая заявка будет доступна через X дн."

---

## Testing Flow 2: Telegram Bot (Phone)

### Prerequisites
- Telegram installed on phone
- Already have a Telegram bot token from @BotFather
- ngrok URL from step above

### Setup: Register Telegram Webhook
```bash
curl -X POST https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-ngrok-url.ngrok.io/api/webhooks/telegram",
    "secret_token": "test_secret_123"
  }'
```

Expected response:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

### Test 2.1: Start Bot & Open Mini-App (Phone)
1. Open Telegram on phone
2. Find your test bot
3. Click "START" button
4. **Expected on phone:**
   - ✅ Welcome message appears
   - ✅ See button "📱 Открыть приложение"
5. Click "📱 Открыть приложение"
6. **Expected:**
   - ✅ Mini-app loads in Telegram
   - ✅ See form to create inquiry
   - ✅ Same UI as web version

### Test 2.2: Create Inquiry via Telegram Mini-App (Phone)
1. Fill out the inquiry form
2. Click "Создать заявку"
3. **Expected on phone:**
   - ✅ Success message
   - ✅ Dashboard shows inquiry with color tag
4. **Expected in server logs:**
   - ✅ `[Telegram] Received update:` log entry

### Test 2.3: Create Second Inquiry (Phone)
1. Click "Создать новую заявку"
2. Fill different car model
3. Submit
4. **Expected:**
   - ✅ Success
   - ✅ Counter shows "0 из 2"

### Test 2.4: Try Third Inquiry (Should Fail)
1. Click "Создать новую заявку"
2. Fill form
3. Submit
4. **Expected:**
   - ❌ Error: "Вы исчерпали лимит заявок"

---

## Testing Flow 3: MAX Bot (If Available)

### Prerequisites
- MAX installed on phone (or web version)
- MAX bot created and token obtained
- Business account set up

### Setup: Register MAX Webhook
You can use the helper function:

```bash
# In Node.js or via API call
curl -X POST https://platform-api.max.ru/subscriptions \
  -H "Authorization: <MAX_BOT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-ngrok-url.ngrok.io/api/webhooks/max"}'
```

Expected response:
```json
{"ok": true, "result": {"url": "https://your-ngrok-url.ngrok.io/api/webhooks/max"}}
```

### Test 3.1: Start Bot & Open Mini-App (Phone)
1. Open MAX on phone
2. Find your test bot
3. Click bot to open chat
4. **Expected:**
   - ✅ Welcome message with button
   - ✅ Button says "Открыть приложение"
5. Click button
6. **Expected:**
   - ✅ Mini-app opens in MAX WebView
   - ✅ See inquiry form

### Test 3.2: Create Inquiry via MAX Mini-App (Phone)
1. Fill form with car details
2. Submit
3. **Expected on phone:**
   - ✅ Success notification
   - ✅ Dashboard visible
4. **Expected in logs:**
   - ✅ `[MAX] Received event: type=message_new`

### Test 3.3: Verify Webhook Receives Events
Check logs while interacting:
```
[MAX] Received update: { type: 'message_new', userId: 12345 }
[MAX] Message from 12345: "/start"
```

---

## Testing Flow 4: Dealer Portal (Web Browser)

### Prerequisites
- Dealer credentials configured (see `DEALER_CREDENTIALS` in `.env.local`)
- Set up like: `dealer1:password123,dealer2:password456`

### Test 4.1: Login to Dealer Portal
1. Open browser: `http://localhost:3000/dealer`
2. Enter credentials:
   - Username: `dealer1`
   - Password: `password123`
3. Click "Войти"
4. **Expected:**
   - ✅ Redirected to dealer dashboard
   - ✅ See "Активные заявки" section
   - ✅ See the inquiries created earlier

### Test 4.2: Submit Offer to Inquiry
1. Click on an inquiry
2. See form to submit offer
3. Enter:
   - Price: "5000000"
   - Comment: "Лучшее предложение"
4. Click "Отправить предложение"
5. **Expected:**
   - ✅ Offer created successfully
   - ✅ See offer in list with price, comment, timestamp
   - ✅ Can submit multiple offers (up to 5)

### Test 4.3: Submit 5 Offers (Test Limit)
1. Try to submit 6th offer to same inquiry
2. **Expected:**
   - ❌ Error: "Максимум 5 предложений от одного дилера"

### Test 4.4: View Competing Offers
1. In inquiry detail, scroll down
2. **Expected:**
   - ✅ See "Дилер A", "Дилер B", etc. (anonymized)
   - ✅ See count of their offers
   - ✅ NO actual dealer names visible

---

## Testing Flow 5: Buyer Accepting Offers (Phone + Browser)

### Prerequisite
- Create 2+ inquiries
- Have dealers submit offers to them

### Test 5.1: View Offers (Phone)
1. Open mini-app on phone
2. Click on an inquiry
3. **Expected:**
   - ✅ See all offers grouped by dealer
   - ✅ Dealer names visible (not anonymized for buyer)
   - ✅ Prices shown
   - ✅ See "Вы приняли: 0 из 3" counter

### Test 5.2: Accept First Offer (Phone)
1. Click "Принять предложение" on best offer
2. **Expected:**
   - ✅ Toast: "Предложение принято!"
   - ✅ Counter changes to "1 из 3"
   - ✅ Button on that offer shows checkmark
   - ✅ Can't accept another from same dealer

### Test 5.3: Accept Second & Third Offers (Phone)
1. Accept offer from different dealer
2. **Expected:**
   - ✅ Counter: "2 из 3"
3. Accept third offer from another dealer
4. **Expected:**
   - ✅ Counter: "3 из 3"
   - ✅ Accept buttons disabled on all remaining

### Test 5.4: Try Fourth Acceptance (Should Fail)
1. Try to accept another offer
2. **Expected:**
   - ❌ Button disabled
   - ❌ Message: "Вы использовали все доступные принятия"

---

## Testing Flow 6: Notifications (Server Logs)

### Test 6.1: Watch Notification Logs

When creating inquiries, watch terminal for:
```
[Notifications] Sending buyer notification: inquiry created
[Notifications] Sending dealer notifications: new inquiry
✓ Buyer notified
✓ Dealer notified
```

### Test 6.2: Message Sending via Telegram Bot

In browser console:
```javascript
// Send test message to Telegram
fetch('http://localhost:3000/api/debug/test-notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'TELEGRAM',
    message: 'Test notification'
  })
})
```

**Expected:**
- ✅ Message appears in Telegram chat
- ✅ Log shows `[Notifications] Message sent to Telegram`

### Test 6.3: Message Sending via MAX Bot

```javascript
fetch('http://localhost:3000/api/debug/test-notify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    platform: 'MAX',
    message: 'Test notification from AutoAuction'
  })
})
```

**Expected:**
- ✅ Message appears in MAX chat
- ✅ Log shows `[MAX] Message sent successfully`

---

## Testing Flow 7: Database State

### Test 7.1: Verify Inquiry Limits Work

Clear database and test again:
```bash
bun run db:clear
```

1. Create inquiry #1 → Success
2. Create inquiry #2 → Success  
3. Create inquiry #3 → Should fail
4. Wait 15 days (or manually update DB)
5. Create inquiry #3 → Should succeed

### Test 7.2: Verify Transaction Uniqueness

1. Accept offer from dealer A → Success
2. Try accept another offer from dealer A → Should fail
3. Accept offer from dealer B → Success
4. Max 3 acceptances → 4th should fail

---

## Testing Flow 8: Color Tags & Anonymization

### Test 8.1: Inquiry Color Tags
1. Create multiple inquiries
2. **Expected:**
   - ✅ Each has different color tag
   - ✅ Same inquiry always same color
   - ✅ Colors distinct for visibility

### Test 8.2: Dealer Anonymization
1. Create 3 inquiries
2. Have 3+ dealers submit offers
3. Open as Dealer A in portal
4. **Expected:**
   - ✅ See "Дилер B", "Дилер C", "Дилер D"
   - ✅ NO actual dealer names exposed
   - ✅ Names consistent (Dealer B is always B)

---

## Testing Checklist

### Buyer (Web + Phone)
- [ ] Create 2 inquiries successfully
- [ ] 3rd inquiry fails with limit message
- [ ] View all offers for inquiry
- [ ] Accept up to 3 offers (different dealers)
- [ ] 4th acceptance fails
- [ ] Can't accept 2 from same dealer
- [ ] Inquiry color tags visible
- [ ] Timestamps show relative time (вчера, 3 ч. назад, etc.)

### Dealer (Web)
- [ ] Login to portal
- [ ] See all active inquiries
- [ ] Submit offer to inquiry
- [ ] Submit up to 5 offers to same inquiry
- [ ] 6th offer fails
- [ ] See competing offers anonymized (Дилер A, B, C)
- [ ] View previous/expired inquiries

### Telegram Bot (Phone)
- [ ] Receive welcome message on /start
- [ ] Open mini-app from button
- [ ] Create inquiry in mini-app
- [ ] See dashboard
- [ ] Accept offers in mini-app
- [ ] Receive notifications in Telegram
- [ ] Respond to bot commands

### MAX Bot (Phone - if available)
- [ ] Open bot and see welcome
- [ ] Click button to open mini-app
- [ ] Create inquiry in mini-app
- [ ] Accept offers
- [ ] Receive notifications in MAX chat

### System
- [ ] All database operations succeed
- [ ] Notifications sent reliably
- [ ] Webhooks receive events
- [ ] Error messages clear and helpful
- [ ] Loading states show properly
- [ ] Timestamps correct (including relative times)

---

## Troubleshooting

### Issue: Webhook not receiving events
**Solution:**
1. Check ngrok is running: `ngrok http 3000`
2. Verify webhook URL in .env matches ngrok URL
3. Check secret token matches in Telegram/MAX settings
4. Look at server logs for `[Telegram]` or `[MAX]` entries

### Issue: Mini-app won't load
**Solution:**
1. Make sure dev server is running: `bun run dev`
2. Check browser console for errors
3. Verify `NEXT_PUBLIC_APP_URL` is set correctly
4. Try hard refresh (Ctrl+Shift+R)

### Issue: Inquiries not creating
**Solution:**
1. Check database is accessible: `bun run db:clear`
2. Check `.env.local` has `DATABASE_URL`
3. Look for validation errors in browser console
4. Check server logs for API errors

### Issue: Notifications not sending
**Solution:**
1. Verify bot tokens are correct (check with `/me` endpoint)
2. Check webhooks are registered
3. Look at server logs for `[Notifications]` entries
4. Verify `chat_id` is correct

### Issue: "Unknown recipient" error from MAX
**Solution:**
1. Ensure webhook is registered FIRST
2. Open mini-app at least once (establishes chat)
3. Check chat_id is being saved correctly
4. Try sending message again

---

## Quick Reference

### Common Commands

Register webhooks:
```bash
# Telegram
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ngrok-url.ngrok.io/api/webhooks/telegram", "secret_token": "test_secret_123"}'

# MAX
curl -X POST https://platform-api.max.ru/subscriptions \
  -H "Authorization: <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://ngrok-url.ngrok.io/api/webhooks/max"}'
```

Check webhook status:
```bash
# Telegram
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo

# MAX
curl -X GET https://platform-api.max.ru/subscriptions \
  -H "Authorization: <TOKEN>"
```

Clear database:
```bash
bun run db:clear
```

Run tests:
```bash
bun test src/__tests__/happy
```

---

## What to Test with Phone

**With Telegram on phone:**
1. Start bot
2. Click to open mini-app
3. Create inquiry
4. Go back to Telegram
5. Check for notifications
6. Accept offers in mini-app
7. Verify notifications appear

**With MAX on phone:**
1. Same as Telegram (if MAX available)

**Browser testing:**
1. Create inquiries (test limits)
2. Switch to dealer account
3. Submit offers
4. Switch to buyer
5. Accept offers
6. Verify all UI updates

---

## Expected Success Indicators

✅ All 93 tests passing  
✅ Build successful  
✅ Zero TypeScript errors  
✅ Webhooks receiving events  
✅ Notifications sending reliably  
✅ Inquiry limits enforced  
✅ Offer caps working  
✅ Acceptance limits working  
✅ Color tags displaying  
✅ Dealer anonymization working  
✅ Timestamps correct  
✅ All flows functional on both platforms  

---

## Next Steps After Testing

1. Document any bugs found
2. Run: `bun run test:live-db` to confirm tests still pass
3. Deploy to staging if all tests pass
4. Get user acceptance testing
5. Deploy to production

Good luck with testing! 🚀
