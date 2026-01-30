# AutoAuction Demo Guide - Quick Start

## 🎯 What This App Does

**AutoAuction** connects car buyers with Lada dealers:
1. Users create inquiries via Telegram mini-app
2. Dealers see inquiries and make offers
3. Users accept offers → Dealers get contact info to close the sale

---

## 🚀 Quick Demo (5 Minutes)

### Step 1: Clear Database

```bash
curl -X POST https://autoauction-two.vercel.app/api/admin/clear-db
```

### Step 2: User Creates Inquiry (Telegram)

**On Phone:**
1. Open Telegram
2. Search: `@autoauction_bot`
3. Tap START, then tap menu button at bottom
4. Fill inquiry form:
   - Model: **Vesta**
   - Submodel: **Cross**
   - Transmission: **Автомат**
   - Color: **Черный**
   - Name: **Ivan Petrov**
   - Phone: **+79991234567**
5. Submit

**Expected**: Bot sends message confirming inquiry created

### Step 3: Dealer Makes Offer (Browser)

**On Computer:**
1. Go to: https://autoauction-two.vercel.app/dealer
2. Login: `dealer1` / `dealer1`
3. Click the Vesta inquiry
4. Enter offer:
   - Price: **1450000**
   - Comment: **Готов к поставке через 3 дня**
5. Click "Сохранить"

**Expected**: Blue card shows "⏳ Ожидание ответа покупателя"

### Step 4: User Accepts Offer (Telegram)

**On Phone:**
1. In Telegram, tap "Auto Auction" button (or menu button)
2. Click your inquiry
3. See "1 предложение" → Click "Смотреть предложения"
4. See offer from dealer1 with price
5. Click "Принять предложение"
6. Confirm dialog

**Expected**: Offer marked as accepted

### Step 5: Dealer Sees Lead (Browser)

**On Computer:**
1. Refresh dealer page
2. Click same inquiry

**Expected**: 
- Green card "✅ Лид получен!"
- Shows: Ivan Petrov, +79991234567 (clickable)
- Dealer can call buyer

---

## 📋 Admin Panel

**URL**: https://autoauction-two.vercel.app/admin  
**Login**: `admin` / `admin123`

View all:
- Buyers (with Telegram ID)
- Inquiries (24h expiration)
- Dealers (dealer1, dealer2)
- Offers (with prices)
- Leads (accepted offers)

---

## 🧪 Testing Multiple Dealers

### Add Second Dealer Offer:

1. Logout from dealer1
2. Login as dealer2: `dealer2` / `dealer2`
3. Same inquiry, make offer: **1400000**
4. User sees **2 предложения**
5. User can accept both → Both dealers get leads

---

## 🎨 Key Features Demo

### 1. Offer Status Indicators

Dealers see 3 states:
- **⏳ Pending** (blue) - Waiting for buyer, shows countdown
- **✅ Accepted** (green) - Shows buyer contact info
- **⏰ Expired** (gray) - 24h passed, shows submitted offer

### 2. User Dashboard

- Shows all inquiries with timer
- Offer count badge
- Dealer names on offers
- Accept multiple offers

### 3. Notifications

- User gets Telegram message after creating inquiry
- Includes inquiry details and 24h notice
- Menu button to return to app

---

## 🔄 Reset for Next Demo

```bash
# Clear all data
curl -X POST https://autoauction-two.vercel.app/api/admin/clear-db

# Or via admin panel:
# https://autoauction-two.vercel.app/admin
# (if Clear DB button is added)
```

---

## 💡 Demo Talking Points

### Problem
"Car buyers waste time visiting multiple dealers. Dealers miss potential customers."

### Solution
"Users create one inquiry. Dealers compete with offers. Best price wins."

### Tech Stack
- **Frontend**: Next.js 16 + Tailwind
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (Neon)
- **Bots**: Telegram Bot API
- **Deploy**: Vercel

### Business Model
- Dealers pay per lead (when user accepts)
- 24h urgency drives quick decisions
- Implicit rejection (no spam for dealers)

---

## 🎯 Common Demo Scenarios

### Scenario 1: Multiple Offers, User Chooses Best

1. dealer1 offers 1,500,000
2. dealer2 offers 1,450,000
3. dealer3 offers 1,400,000
4. User accepts dealer3 (lowest price)
5. Only dealer3 gets lead

### Scenario 2: User Accepts Multiple

1. Multiple dealers make offers
2. User accepts 2-3 best offers
3. All accepted dealers get leads
4. User picks final winner via phone

### Scenario 3: No Offers (Expired)

1. User creates inquiry
2. No dealers make offers
3. After 24h: Inquiry expires
4. User can create new inquiry

---

## 🐛 Troubleshooting

**Bot doesn't send messages:**
- Check user started @autoauction_bot
- Verify TG_BOT_TOKEN in Vercel env vars

**Dealer can't see inquiry:**
- Check inquiry not expired (24h limit)
- Verify dealer login credentials

**Offer form broken:**
- Enter price as numbers only (e.g., 1500000)
- No spaces or currency symbols

---

## 📊 Demo Metrics to Show

After demo, show in admin panel:
- **1 Buyer** (Telegram user)
- **1 Inquiry** (Vesta Cross)
- **2 Dealers** (dealer1, dealer2)
- **2 Offers** (prices shown)
- **1 Lead** (accepted offer with contact)

---

## 🚀 Live Demo Checklist

- [ ] Clear DB before demo
- [ ] Test Telegram bot works (send yourself a message)
- [ ] Dealer1 login ready in browser
- [ ] Admin panel open in another tab
- [ ] Phone with Telegram ready
- [ ] Rehearse: 2 min user flow, 1 min dealer flow, 1 min admin panel

**Total demo time**: 5 minutes  
**Wow factor**: Real-time Telegram integration + instant lead generation

