# End-to-End Testing Guide (Localhost + ngrok)

## Prerequisites

1. **Start the dev server**:

   ```bash
   cd /Users/vlad/Documents/_projects/_glebproj/autoauction
   source ~/.nvm/nvm.sh
   nvm use 20
   bun dev
   ```

   Server should be running on `http://localhost:3000`

2. **Start ngrok** (in a separate terminal):

   ```bash
   ngrok http 3000
   ```

   Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

3. **Configure Telegram Bot** (one-time):
   - Open Telegram → @BotFather
   - Send: `/mybots` → select `autoauction_bot`
   - Bot Settings → Menu Button → Configure Menu Button
   - Enter: `https://YOUR-NGROK-URL.ngrok-free.app/app`

---

## Test Case 1: User Creates Inquiry (Telegram)

### Steps:

1. **Open bot on phone**:
   - Open Telegram
   - Search `@autoauction_bot`
   - Tap START
   - Tap the menu button (bottom of screen)

2. **Fill inquiry form**:
   - Model: `Vesta`
   - Submodel: `Cross`
   - Transmission: `Автомат`
   - Color: `Серый`
   - Name: `Test User`
   - Phone: `+79991234567`
   - Email: `test@example.com` (optional)
   - Check consent box
   - Submit

3. **Expected Result**:
   - Redirected to dashboard
   - Shows "Ваша заявка создана"
   - Inquiry appears with 24h timer

4. **Verify backend**:
   ```bash
   # In terminal:
   bun --env-file=.env.local run scripts/show-buyers.ts
   ```
   Should show buyer with `platform: TELEGRAM`

---

## Test Case 2: Dealer Views Inquiry

### Steps:

1. **Open dealer dashboard**:
   - Browser: `http://localhost:3000/dealer`
   - Login: `dealer1` / `dealer1`

2. **Check inquiry list**:
   - Should see the inquiry you just created
   - Shows: Model, Submodel, Transmission, Color
   - Shows: "Осталось: ~24ч"

3. **Expected Result**:
   - Inquiry is visible
   - No offer shown yet

---

## Test Case 3: Dealer Makes Offer

### Steps:

1. **Click on the inquiry** (from dealer dashboard)

2. **Fill offer form**:
   - Price: `1500000` (1.5M rubles)
   - Comment: `Готов к поставке в течение недели`
   - Submit

3. **Expected Result**:
   - Blue card appears: "⏳ Ожидание ответа покупателя"
   - Shows your offer price and comment
   - Shows time remaining
   - Offer form is disabled

4. **Verify in inquiry list**:
   - Go back to `/dealer/inquiries`
   - Should show: "Ваше предложение: 1500000 ₽" with "⏳ В ожидании" badge

---

## Test Case 4: User Sees Offer

### Steps:

1. **On phone (Telegram)**:
   - Open mini-app again (menu button)
   - Should see dashboard with your inquiry

2. **Click on inquiry**:
   - Should show: "1 предложение"
   - Click "Смотреть предложения"

3. **Expected Result**:
   - Offer card shows:
     - Price: `1 500 000 ₽`
     - Dealer name: `dealer1`
     - Comment: "Готов к поставке в течение недели"
   - "Принять предложение" button is visible

---

## Test Case 5: User Accepts Offer (Creates Lead)

### Steps:

1. **Click "Принять предложение"**

2. **Confirm dialog**:
   - Should warn: "Ваши контактные данные будут переданы дилеру"
   - Click OK

3. **Expected Result**:
   - Success message
   - Offer card now shows green checkmark or "Принято"

---

## Test Case 6: Dealer Sees Lead (Contact Info)

### Steps:

1. **Browser (dealer dashboard)**:
   - Refresh `/dealer/inquiries`
   - Should show: "✓ Принято" badge on inquiry

2. **Click on inquiry**:
   - Green card appears: "✅ Лид получен!"
   - Shows buyer contact info:
     - Name: `Test User`
     - Phone: `+79991234567` (clickable tel: link)
     - Email: `test@example.com` (clickable mailto: link)
     - Timestamp when accepted

3. **Expected Result**:
   - Dealer can see and contact buyer
   - Offer form is disabled

---

## Test Case 7: Second Dealer Makes Offer

### Steps:

1. **Logout** from dealer1:
   - Clear browser cookies or use incognito

2. **Login as dealer2**:
   - `http://localhost:3000/dealer`
   - Login: `dealer2` / `dealer2`

3. **Make offer**:
   - Same inquiry should be visible
   - Price: `1450000`
   - Comment: `Лучшая цена + подарок`
   - Submit

4. **User checks on phone**:
   - Refresh inquiry page
   - Should now see: "2 предложения"
   - Both offers visible with different dealer names

5. **User accepts second offer**:
   - Same process as Test Case 5

6. **Both dealers see leads**:
   - dealer1: Still sees their lead
   - dealer2: Now sees their lead too

---

## Test Case 8: Inquiry Expiration (24h)

### Manual test (not practical for real-time):

To test expiration quickly, modify the database:

```bash
# Update inquiry to expire in 1 minute
bun --env-file=.env.local -e '
import { prisma } from "./src/lib/db";
const inquiry = await prisma.inquiry.findFirst({ orderBy: { createdAt: "desc" } });
if (inquiry) {
  await prisma.inquiry.update({
    where: { id: inquiry.id },
    data: { expiresAt: new Date(Date.now() + 60 * 1000) }
  });
  console.log("Inquiry expires in 1 minute");
}
await prisma.$disconnect();
'
```

Wait 1 minute, then:

1. **Dealer dashboard**: Shows "⏰ Заявка истекла" (gray card)
2. **User dashboard**: Inquiry should no longer accept new offers
3. **New dealers**: Can't make offers on expired inquiry

---

## Test Case 9: Admin Dashboard

### Steps:

1. **Open admin panel**:
   - `http://localhost:3000/admin`
   - Login: `admin` / `admin123`

2. **Navigate through sections**:
   - **Buyers**: Should see test user with Telegram platform
   - **Inquiries**: Should see all inquiries with status
   - **Dealers**: Should see dealer1 and dealer2
   - **Offers**: Should see all offers with prices
   - **Leads**: Should see accepted offers with contact info

3. **Click through details**:
   - Each item should link to detail page
   - All relationships should be visible

---

## Test Case 10: Multiple Offers, User Rejects Implicitly

### Steps:

1. **Create new inquiry** (phone)
2. **3 dealers make offers**:
   - dealer1: 1,500,000
   - dealer2: 1,450,000
   - Create dealer3 if needed

3. **User accepts only dealer2's offer**

4. **Expected Result**:
   - dealer2: Sees lead (green card)
   - dealer1: Still shows "⏳ В ожидании" (blue card)
   - No explicit rejection - implicit rejection = user didn't accept
   - After 24h expires: Both see "⏰ Заявка истекла"

---

## Test Case 11: Clear Database & Start Fresh

### Steps:

```bash
# Via API:
curl -X POST http://localhost:3000/api/admin/clear-db

# Or via admin UI (if implemented):
# http://localhost:3000/admin → Clear DB button
```

**Expected Result**: All buyers, inquiries, dealers (except hardcoded ones), offers, and leads deleted

---

## What's Currently Working ✅

1. **User Flow**:
   - ✅ Create inquiry via Telegram/MAX mini-app
   - ✅ View own inquiries on dashboard
   - ✅ See offer count on each inquiry
   - ✅ View offers with dealer names
   - ✅ Accept multiple offers (creates leads)
   - ✅ Confirmation dialog before accepting

2. **Dealer Flow**:
   - ✅ View all active inquiries (24h window)
   - ✅ Make offers with price + comment
   - ✅ See offer status:
     - ⏳ Pending (blue, with timer)
     - ✅ Accepted (green, with buyer contact info)
     - ⏰ Expired (gray, with submitted offer)
   - ✅ Clickable phone/email links for leads
   - ✅ Offer form disabled after accept/expire
   - ✅ Each dealer sees only their own offers

3. **Admin Flow**:
   - ✅ View all buyers, inquiries, dealers, offers, leads
   - ✅ Detail pages for each entity
   - ✅ Clear database for testing

4. **Database**:
   - ✅ Lead telemetry fields (closedAt, status, notes)
   - ✅ 24h expiration enforcement
   - ✅ Proper relationships between entities

---

## What's NOT Implemented Yet ❌

1. **Notifications**:
   - ❌ Dealers don't get notified of new inquiries
   - ❌ Users don't get notified of new offers
   - ❌ No bot messages sent automatically
   - 📝 Documented in `docs/step1.md` as known limitation

2. **Dealer Discovery**:
   - ✅ Currently hardcoded: dealer1, dealer2
   - ❌ No dealer registration flow
   - ❌ No dealer approval process

3. **Lead Management**:
   - ✅ Telemetry fields exist (status, notes)
   - ❌ No dealer UI to update lead status
   - ❌ No dealer notes feature
   - ❌ No lead closure workflow

4. **User Profile**:
   - ❌ Users can't edit their profile
   - ❌ No saved preferences

5. **Advanced Features**:
   - ❌ No dealer ratings/reviews
   - ❌ No offer counter-proposals
   - ❌ No inquiry editing after creation
   - ❌ No inquiry cancellation by user
   - ❌ No offer withdrawal by dealer

---

## Known Issues / Edge Cases

1. **Multiple accepts**: User can accept multiple offers - this is BY DESIGN
2. **No reject button**: User rejects implicitly by not accepting - BY DESIGN
3. **Dealer list**: Hardcoded for MVP - document in step1.md ✅
4. **No notifications**: Must manually check - documented ✅

---

## Quick Test Commands

```bash
# Show all buyers
bun --env-file=.env.local run scripts/show-buyers.ts

# Clear database
curl -X POST http://localhost:3000/api/admin/clear-db

# Send test Telegram notification
bun --env-file=.env.local run scripts/test-telegram-notification.ts <chat_id> "Test"

# Send test MAX notification
bun --env-file=.env.local run scripts/test-max-notification.ts <chat_id> "Test"

# Check Prisma migration status
bun --env-file=.env.local prisma migrate status

# Run tests
bun test

# Build production
bun run build
```

---

## Troubleshooting

**Mini-app doesn't load on phone**:

- Check ngrok is running and URL is updated in BotFather
- Try opening ngrok URL directly in phone browser first
- Check for CORS errors in browser console

**Dealer can't see inquiry**:

- Check inquiry isn't expired (24h window)
- Check dealer credentials are correct
- Clear browser cache/cookies

**Form submission fails**:

- Check browser console for errors
- Verify platform detection (Telegram vs MAX)
- Check initData is being captured

**Database changes not reflected**:

- Refresh the page
- Check migration status
- Verify .env.local has correct DB URL
