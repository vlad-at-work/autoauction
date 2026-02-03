# 📱 Live Testing Guide - Two Phones with MAX & Telegram

**Prerequisites**: Database cleared with `bun run db:clear`

This guide tests the complete user journey with real phones:

- **Phone 1** (Dealer): Separate phone number with MAX & Telegram
- **Phone 2** (Customer): Different phone number with MAX & Telegram

---

## 🎯 Test Scenario Overview

1. Admin creates dealer account
2. Dealer sets up password (first login)
3. Customer creates inquiry
4. Dealer submits 3 competing offers (reverse auction)
5. Customer accepts best offer
6. Both see correct UI states
7. Admin verifies transaction with billing data

---

## 📋 Phase 1: Admin Setup (Computer/Browser)

### Step 1.1: Access Admin Panel

**URL**: `https://your-app.vercel.app/admin`

**Credentials**:

- Username: `admin`
- Password: `admin123`

**Expected**:

- ✅ Basic Auth prompt appears
- ✅ After login, dashboard shows 0 dealers, 0 buyers, 0 inquiries

---

### Step 1.2: Create Dealer Account

**Navigation**: Admin → Dealers → "New Dealer" button

**Form Data**:

```
Username:    moscowmotors     (unique, no spaces, lowercase)
Name:        Moscow Motors
Phone:       +7 (499) 555-1234
Email:       dealer@moscowmotors.ru
Description: Official Lada dealer in Moscow
Active:      ✅ Checked
```

**Actions**:

1. Fill in all fields
2. Click "Create Dealer"
3. **Note the Dealer ID** from URL or page (e.g., `cm1abc123...`)

**Expected**:

- ✅ Redirected to dealer detail page
- ✅ Dealer created successfully
- ✅ Shows: `passwordHash: Not Set` (dealer hasn't logged in yet)
- ✅ Shows: `platform: null` (not associated with Telegram/MAX yet)
- ✅ Shows: `Active: Yes`

**Values to Record**:

```
Dealer Username: moscowmotors
Dealer ID:       cm1abc123...
```

---

## 📱 Phase 2: Dealer First-Time Setup (Phone 1)

**Choose Platform**: Telegram OR MAX (test with both if possible)

### Option A: Using Telegram on Phone 1

**Step 2A.1**: Open Telegram dealer bot

1. Open Telegram app
2. Search for: `@autoauctiondealer_bot`
3. Tap the bot to open chat
4. Send: `/start`
5. Bot responds with welcome message
6. Tap **"Open Mini App"** button or **Menu button (☰)**

**Expected**:

- ✅ Mini-app opens in Telegram WebView
- ✅ Shows white screen or loading screen briefly
- ✅ App loads at `/dealerinterface`

---

**Step 2A.2**: First-time password setup

**Expected UI** at `/dealerinterface/setup`:

- Title: **"Настройка пароля"** (Password Setup)
- Subtitle: Instructions about first-time setup
- Form fields:
  - **Username** dropdown or input: Select `moscowmotors`
  - **Password** input: Minimum 6 characters
  - **Confirm Password** input
  - **"Установить пароль"** button

**Actions**:

1. Select username: `moscowmotors`
2. Enter password: `DealerPass123!`
3. Confirm password: `DealerPass123!`
4. Tap **"Установить пароль"**

**Expected Results**:

- ✅ Password set successfully
- ✅ Session created automatically
- ✅ Redirected to `/dealerinterface/dashboard`
- ✅ Dashboard header shows **"Moscow Motors"** (dealer name)
- ✅ Section: **"Активные заявки"** with message "Пока нет активных заявок"
- ✅ Refresh button (↻) visible in top-right
- ✅ Logout button visible

---

**Step 2A.3**: Verify in admin (Computer)

**Navigation**: Admin → Dealers → moscowmotors

**Expected Changes**:

- ✅ `platform`: **TELEGRAM**
- ✅ `platformUserId`: Shows your Telegram user ID (e.g., "123456789")
- ✅ `platformChatId`: Shows your Telegram chat ID
- ✅ `passwordHash`: Shows encrypted bcrypt hash (starts with "$2")

**Values to Record**:

```
Dealer Platform:       TELEGRAM
Dealer Telegram ID:    123456789
Password Hash Present: Yes
```

---

### Option B: Using MAX on Phone 1

**(Same as Option A but with MAX bot)**

**Step 2B.1**: Open MAX dealer bot

1. Open MAX app
2. Search for: `id5010035001_1_bot` (dealer bot)
3. Tap to open chat
4. Send: `/start`
5. Tap **"Open Mini App"** or menu button

**Continue with same setup process as Telegram...**

---

## 📱 Phase 3: Customer Creates Inquiry (Phone 2)

**Choose Platform**: Telegram OR MAX (can be different from dealer)

### Step 3.1: Open Customer Bot (Telegram on Phone 2)

**Actions**:

1. Open Telegram on **Phone 2** (different number)
2. Search for: `@autoauction_bot` (customer bot)
3. Tap bot to open
4. Send: `/start`
5. Bot responds with welcome
6. Tap **"Open Mini App"** button

**Expected**:

- ✅ Mini-app opens at `/app`
- ✅ Landing page shows **"AutoAuction"** title
- ✅ Shows **"Создать заявку"** (Create Inquiry) button
- ✅ Shows platform selection (MAX/Telegram logos)

---

### Step 3.2: Create Inquiry

**Actions**:

1. Tap **"Создать заявку"**
2. Redirected to `/app/form`

**Expected Form** at `/app/form`:

- Fields for: Name, Phone, Email, Status, Model, Submodel, Transmission, Color, Comment

**Fill Form**:

```
Имя:                      Петр Иванов
Телефон:                  +7 (916) 777-8888
Email (optional):         petr@example.com
Статус СВО:              Участник СВО / мобилизованный
Модель:                   Vesta
Подмодель:                sedan
Коробка передач:          Механика
Цвет:                     Белый
Комментарий (optional):   Срочно нужен автомобиль для работы
```

**Actions**:

1. Fill all required fields
2. Tap **"Отправить заявку"** (Submit Inquiry)

**Expected Results**:

- ✅ Form validation passes
- ✅ Loading indicator appears briefly
- ✅ Redirected to `/app/dashboard`
- ✅ Dashboard shows **1 inquiry card**:
  - Badge with colored ID (e.g., "AB12CD" in blue box)
  - Title: **"Vesta • sedan"**
  - Details: "Механика • Белый"
  - Timer: **"~24ч"** (hours remaining)
  - Status badge: **"Новая"** or similar
  - Badge: **"0 предл."** (0 offers)
- ✅ Counter at top: **"Использовано: 1 из 2 заявок в месяц"**
- ✅ Next reset date shown

**Values to Record**:

```
Inquiry ID Badge:  AB12CD (note the color and letters)
Customer Name:     Петр Иванов
Customer Phone:    +7 (916) 777-8888
Model:             Vesta • sedan
```

---

### Step 3.3: Verify Dealer Receives Notification (Phone 1)

**Check Phone 1** (Dealer's Telegram):

**Expected Notification** from `@autoauctiondealer_bot`:

```
🚗 Новая заявка: Vesta • sedan

Параметры:
• Коробка: Механика
• Цвет: Белый

[Открыть заявку] (button)
```

**Actions on Phone 1**:

1. Tap the notification OR
2. Go back to dealer mini-app
3. Pull down to refresh dashboard (or wait 30 seconds for auto-refresh)

**Expected in Dealer Dashboard**:

- ✅ **"Активные заявки"** section now has **1 inquiry**:
  - Same badge: **"AB12CD"** (same color as customer's)
  - Title: **"Vesta • sedan"**
  - Details: "Механика • Белый"
  - Timer: **"~24ч"**
  - Badge: **"0 предл."** (no offers yet)

---

## 💰 Phase 4: Dealer Submits Multiple Offers (Phone 1)

### Step 4.1: View Inquiry Details

**Actions on Phone 1** (Dealer app):

1. Tap the inquiry card **"Vesta • sedan"**
2. Opens `/dealerinterface/inquiry/[id]`

**Expected UI**:

- **Inquiry Summary** at top:
  - Model: Vesta • sedan
  - Transmission: Механика
  - Color: Белый
  - Customer comment: "Срочно нужен автомобиль для работы"
  - Time remaining: ~24 hours
- **Section**: **"Ваши предложения"** (empty initially)
- **Section**: **"Другие предложения"** (empty - no other dealers yet)
- **Offer Form**:
  - Price input field (₽)
  - Comment textarea
  - **"Отправить предложение"** button
  - Counter: **"Можно отправить ещё 5 предложений"**

---

### Step 4.2: Submit Offer #1 (High Price)

**Actions**:

1. Enter price: `1500000` (without spaces)
2. Enter comment: `Отличная цена! Автомобиль в наличии, доставка бесплатно.`
3. Tap **"Отправить предложение"**

**Expected Results on Phone 1**:

- ✅ Form clears
- ✅ Success message or toast notification
- ✅ **"Ваши предложения"** section now shows:
  - **Offer #1**:
    - Price: **"1 500 000 ₽"** (formatted with spaces)
    - Comment displayed
    - Timestamp (e.g., "1 мин. назад")
    - Badge: **"Предложение #1"**
  - Status: **"⏳ Ожидание"** (Waiting)
- ✅ Counter updates: **"Можно отправить ещё 4 предложения"**
- ✅ Form still visible (can submit more)

---

### Step 4.3: Customer Receives Notification (Phone 2)

**Check Phone 2** (Customer's Telegram):

**Expected Notification** from `@autoauction_bot`:

```
💰 Новое предложение на Vesta • sedan

Цена: 1 500 000 ₽

🎉 Это первое предложение на вашу заявку!

[Посмотреть] (button)
```

**Don't tap yet** - dealer will submit more offers first.

---

### Step 4.4: Submit Offer #2 (Lower Price)

**Actions on Phone 1**:

1. Scroll to offer form (should still be visible)
2. Enter price: `1450000`
3. Enter comment: `Снизил цену! Специальное предложение только для вас.`
4. Tap **"Отправить предложение"**

**Expected Results**:

- ✅ Offer #2 added to **"Ваши предложения"**
- ✅ Shows **2 offers** now (newest first)
- ✅ Counter: **"Можно отправить ещё 3 предложения"**

**Phone 2**: Receives **2nd notification** with price 1,450,000 ₽ (no "first offer" badge this time)

---

### Step 4.5: Submit Offer #3 (Best Price)

**Actions on Phone 1**:

1. Enter price: `1400000`
2. Enter comment: `Финальная цена — лучшее предложение на рынке!`
3. Tap **"Отправить предложение"**

**Expected Results on Phone 1**:

- ✅ **"Ваши предложения"** shows **3 offers**:
  - Offer #3: 1,400,000 ₽ (newest, at top)
  - Offer #2: 1,450,000 ₽
  - Offer #1: 1,500,000 ₽
- ✅ Counter: **"Можно отправить ещё 2 предложения"**
- ✅ All offers show status: **"⏳ Ожидание"**

**Phone 2**: Receives **3rd notification** with 1,400,000 ₽

---

## ✅ Phase 5: Customer Views and Accepts Offer (Phone 2)

### Step 5.1: View All Offers

**Actions on Phone 2** (Customer app):

1. Go to `/app/dashboard` (or tap any notification)
2. Tap the inquiry card **"Vesta • sedan"**
3. Opens `/app/inquiry/[inquiryId]`

**Expected UI** at inquiry detail page:

- **Inquiry Summary** at top (model, transmission, color)
- **Counter**: **"Принято: 0 из 3 предложений"** (0 of 3 accepted)
- **Offers Section** grouped by dealer:
  - **"Дилер A"** (anonymized - hides real dealer name):
    - **Offer #1**: 1,500,000 ₽
      - Comment shown
      - Timestamp shown
      - Button: **"Принять предложение"**
      - Status: **"⏳ Ожидание"**
    - **Offer #2**: 1,450,000 ₽
      - Comment shown
      - Button: **"Принять предложение"**
      - Status: **"⏳ Ожидание"**
    - **Offer #3**: 1,400,000 ₽
      - Comment shown
      - Button: **"Принять предложение"**
      - Status: **"⏳ Ожидание"**

**Note**: All 3 offers show under same dealer name ("Дилер A") - anonymized.

---

### Step 5.2: Accept Best Offer

**Actions**:

1. Review all offers
2. Tap **"Принять предложение"** on **Offer #3** (1,400,000 ₽)
3. If confirmation dialog appears, confirm

**Expected Results on Phone 2**:

- ✅ Loading indicator briefly
- ✅ Offer #3 status changes to: **"✓ Принято"** (Accepted)
- ✅ Offers #1 and #2 status changes to: **"Другое предложение принято"** (Another accepted)
- ✅ **"Принять предложение"** buttons **disabled** for all 3 offers from Dealer A
- ✅ Counter updates: **"Принято: 1 из 3 предложений"**
- ✅ Customer can still accept from other dealers (if any existed)
- ✅ Success message or toast

---

### Step 5.3: Dealer Receives Acceptance Notification (Phone 1)

**Check Phone 1** (Dealer's Telegram):

**Expected Notification** from `@autoauctiondealer_bot`:

```
🎉 Ваше предложение принято!

Заявка: Vesta • sedan
Цена: 1 400 000 ₽

📞 Контакты покупателя:
Имя: Петр Иванов
Телефон: +7 (916) 777-8888
Email: petr@example.com

[Открыть] (button)
```

**Important**: Dealer now sees customer's real contact info!

---

### Step 5.4: Verify Dealer Dashboard Updates (Phone 1)

**Actions on Phone 1**:

1. Go back to dealer mini-app dashboard
2. Refresh (pull down or wait 30s)

**Expected in** `/dealerinterface/dashboard`:

- ✅ Inquiry card for "Vesta • sedan" shows:
  - Badge: **"✓ Ваше принято"** (Your offer accepted - green badge)
  - Badge: **"1 принято"** (1 total acceptance)
  - Price displayed: **"1 400 000 ₽"**
  - Status badge changed from "Ожидание" to success state

**Tap inquiry card** to view details:

**Expected at** `/dealerinterface/inquiry/[id]`:

- ✅ **"Ваши предложения"** shows 3 offers
- ✅ Offer #3 has badge: **"✓ Принято"**
- ✅ Offer #3 highlighted or styled differently (success state)
- ✅ **Cannot submit new offers** (message: "Ваше предложение уже принято")
- ✅ Form disabled or hidden

---

## 👨‍💼 Phase 6: Admin Verifies Transaction (Computer)

### Step 6.1: View Transactions

**Navigation**: Admin → Transactions

**Expected**:

- ✅ Shows **1 transaction** in list
- ✅ Row displays:
  - Transaction ID
  - Inquiry: "Vesta • sedan" (clickable link)
  - Dealer: "Moscow Motors" (clickable link)
  - Buyer: "Петр Иванов"
  - Price: "1,400,000 ₽"
  - Date: Today's timestamp

---

### Step 6.2: View Transaction Details

**Actions**:

1. Click the transaction row
2. Opens transaction detail page

**Expected Transaction Details**:

**Buyer Information**:

- ✅ Name: **Петр Иванов**
- ✅ Phone: **+7 (916) 777-8888**
- ✅ Email: **petr@example.com**

**Dealer Information**:

- ✅ Dealer: **Moscow Motors** (link to dealer page)
- ✅ Username: **moscowmotors**
- ✅ Phone: **+7 (499) 555-1234**
- ✅ Email: **dealer@moscowmotors.ru**

**Offer & Inquiry Details**:

- ✅ Inquiry: **Vesta • sedan** (link to inquiry page)
- ✅ Offer: Link to offer (1,400,000 ₽)

**Snapshot Data** (immutable billing data):

- ✅ `offerPrice`: **1,400,000**
- ✅ `inquiryModel`: **Vesta**
- ✅ `inquirySubmodel`: **sedan**
- ✅ `inquiryTransmission`: **Механика**
- ✅ `inquiryColor`: **Белый**
- ✅ `dealerUsername`: **moscowmotors**
- ✅ `dealerName`: **Moscow Motors**
- ✅ `dealerPhone`: **+7 (499) 555-1234**
- ✅ `dealerEmail`: **dealer@moscowmotors.ru**

**Timestamps**:

- ✅ `acceptedAt`: Today's timestamp (when customer accepted)
- ✅ `closedAt`: **null** (not closed yet)
- ✅ `deletedAt`: **null**

**Billing Fields** (all initially null):

- ⚠️ `amount`: **null**
- ⚠️ `invoicedAt`: **null**
- ⚠️ `billedAt`: **null**
- ⚠️ `paidAt`: **null**
- ⚠️ `voidedAt`: **null**

---

### Step 6.3: Update Billing Information

**Actions**:

1. Click **"Edit"** button on transaction page
2. Update billing fields:

```
Amount:       1400000      (matches offer price)
Invoiced At:  [Today's date]
Billed At:    [Leave empty for now]
Paid At:      [Leave empty]
```

3. Click **"Save"**

**Expected**:

- ✅ Transaction updated successfully
- ✅ `amount`: **1,400,000**
- ✅ `invoicedAt`: Today's date
- ✅ Can now generate invoices using this data
- ✅ Can track payment status

---

### Step 6.4: Verify Database Stats

**Navigation**: Admin → Dashboard

**Expected Final Stats**:

- ✅ **Dealers**: 1 (Moscow Motors)
- ✅ **Buyers**: 1 (Петр Иванов)
- ✅ **Inquiries**: 1 (Vesta • sedan)
- ✅ **Offers**: 3 (all from same dealer)
- ✅ **Transactions**: 1 (1,400,000 ₽)

---

## 🧪 Phase 7: Additional Test Scenarios

### Test A: Customer Inquiry Limit (Phone 2)

**Actions**:

1. Customer creates 2nd inquiry (should succeed)
2. Dashboard shows: **"2 из 2 заявок"**
3. Attempt to create 3rd inquiry

**Expected**:

- ✅ 2nd inquiry: Success
- ❌ 3rd inquiry: Error message "Вы достигли лимита заявок (2 в месяц)"
- ✅ Form disabled or error shown

---

### Test B: Dealer 5-Offer Limit (Phone 1)

**Setup**: Create new inquiry first

**Actions**:

1. Dealer submits offers #4 and #5 on new inquiry
2. Attempt to submit 6th offer

**Expected**:

- ✅ Offers #4-5: Success
- ✅ Counter shows: "0 предложений осталось"
- ❌ 6th offer: Error "Достигнут лимит предложений (5)"
- ✅ Form disabled

---

### Test C: Multiple Acceptances (Need 3 Dealers)

**Setup**: Admin creates 2 more dealers, all submit offers on same inquiry

**Actions**:

1. Customer accepts 1st dealer's offer
2. Customer accepts 2nd dealer's offer
3. Customer accepts 3rd dealer's offer
4. Attempt to accept 4th dealer's offer

**Expected**:

- ✅ Acceptances #1-3: Success
- ✅ Counter: "3 из 3 предложений"
- ❌ 4th acceptance: Error "Достигнут лимит принятий (3)"
- ✅ All remaining accept buttons disabled

---

### Test D: Inquiry Expiration

**Setup**: Wait 24 hours OR manually change `expiresAt` in admin

**Expected**:

- ✅ Phone 2 (Customer): Inquiry shows **"Истекла"** badge
- ✅ Phone 1 (Dealer): Inquiry moves to **"Прошлые заявки"**
- ❌ Dealer cannot submit new offers (HTTP 410 error)

---

## ✅ Complete Success Checklist

### Phase 1: Admin Setup

- [ ] Admin can login with credentials
- [ ] Admin can create dealer account
- [ ] Dealer shows no password/platform initially

### Phase 2: Dealer Setup

- [ ] Dealer can open bot mini-app
- [ ] First-time password setup works
- [ ] Session created automatically
- [ ] Dashboard loads with empty state
- [ ] Admin sees dealer platform and passwordHash

### Phase 3: Customer Inquiry

- [ ] Customer can open bot mini-app
- [ ] Inquiry form works correctly
- [ ] Inquiry created with 24h timer
- [ ] Customer sees colored ID badge
- [ ] Inquiry counter shows (1 of 2)
- [ ] Dealer receives notification

### Phase 4: Dealer Offers

- [ ] Dealer can view inquiry details
- [ ] Dealer can submit 3 offers
- [ ] Offers display in dealer dashboard
- [ ] Counter decreases correctly
- [ ] Customer receives 3 notifications
- [ ] Notifications show prices correctly

### Phase 5: Customer Acceptance

- [ ] Customer sees all 3 offers grouped
- [ ] Dealer name anonymized (Дилер A)
- [ ] Customer can accept offer
- [ ] UI updates correctly after acceptance
- [ ] Counter shows "1 из 3"
- [ ] Dealer receives acceptance notification
- [ ] Dealer sees customer contact info

### Phase 6: Transaction Verification

- [ ] Admin sees transaction in list
- [ ] Transaction shows correct buyer info
- [ ] Transaction shows correct dealer info
- [ ] Snapshot data captured correctly
- [ ] Admin can update billing fields
- [ ] Dashboard stats are correct

### Phase 7: Edge Cases

- [ ] Inquiry limit enforced (2/month)
- [ ] Offer limit enforced (5/inquiry)
- [ ] Acceptance limit enforced (3/inquiry)
- [ ] Inquiry expiration works (24h)

---

## 🎯 Test Results Template

```
Test Date: ___________
Tester: ___________
Environment: Production / Staging

Phase 1 - Admin Setup:           ✅ / ❌
Phase 2 - Dealer Setup:          ✅ / ❌
Phase 3 - Customer Inquiry:      ✅ / ❌
Phase 4 - Dealer Offers:         ✅ / ❌
Phase 5 - Customer Acceptance:   ✅ / ❌
Phase 6 - Admin Transaction:     ✅ / ❌
Phase 7 - Edge Cases:            ✅ / ❌

Issues Found:
1. _______________________
2. _______________________
3. _______________________

Notes:
_______________________
_______________________
```

---

## 🔧 Troubleshooting

### Bot not responding

- Check bot token in Vercel env vars
- Verify mini-app URL registered in BotFather/MAX cabinet
- Check Vercel deployment logs

### Mini-app shows error

- Check browser console for errors
- Verify WebApp initData is being sent
- Check API route logs in Vercel

### Notifications not received

- Verify chat IDs are correct in database
- Check bot token permissions
- Test with `/api/debug/max/send-test` or similar

### Session expired

- Check SESSION_SECRET is set in Vercel
- Verify cookie settings (httpOnly, secure)
- Check session expiration (7 days default)

---

**End of Live Testing Guide**
