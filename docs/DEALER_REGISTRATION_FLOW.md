# 👨‍💼 Dealer Registration & Authentication Flow

## Overview

**Dealers are pre-registered by admins** with their Telegram/MAX ID. When they open the mini-app, the app automatically knows who they are and guides them to set a password.

---

## Current Flow (Correct Implementation)

### 1️⃣ Admin Pre-Registers Dealer

**Where**: Admin panel → Dealers → New Dealer

**Admin provides** (we collect from dealer):

```
Username:        moscowmotors          (unique identifier)
Name:            Moscow Motors
Phone:           +7 (499) 555-1234
Email:           dealer@moscowmotors.ru
Description:     Official Lada dealer
Platform:        TELEGRAM (or MAX)
Platform User ID: 123456789             (dealer's Telegram/MAX ID)
Active:          ✅ Yes
```

**What gets created in DB**:

```sql
INSERT INTO Dealer (
  username,
  name,
  phone,
  email,
  description,
  platform,
  platformUserId,
  platformChatId,    -- same as platformUserId for Telegram
  passwordHash,      -- NULL initially (not set yet)
  active,
  createdAt
) VALUES (
  'moscowmotors',
  'Moscow Motors',
  '+7 (499) 555-1234',
  'dealer@moscowmotors.ru',
  'Official Lada dealer',
  'TELEGRAM',
  '123456789',
  '123456789',
  NULL,              -- ← Password not set yet
  true,
  now()
);
```

**Admin does NOT set password** - dealer will set it on first login.

---

### 2️⃣ Dealer Opens Mini-App from Phone

**What happens**:

1. Dealer opens Telegram/MAX on their phone
2. Searches for bot: `@autoauctiondealer_bot` (Telegram) or `id5010035001_1_bot` (MAX)
3. Sends `/start`
4. Taps **"Open Mini App"** button
5. Mini-app loads with `window.Telegram.WebApp.initDataUnsafe`:
   ```javascript
   {
     user: {
       id: 123456789,          // ← Their Telegram ID
       is_bot: false,
       first_name: "Петр",
       username: "petr_dealer"
     },
     chat: {
       id: 123456789,
       type: "private"
     }
   }
   ```

---

### 3️⃣ App Checks Dealer Status

**Route**: `/dealerinterface`

**Backend logic**:

```typescript
const platform = detectPlatform(); // TELEGRAM
const userId = WebApp.initDataUnsafe.user.id; // 123456789

// Check if dealer exists with this platform + ID
const dealer = await prisma.dealer.findUnique({
  where: {
    platform_platformUserId: {
      platform: 'TELEGRAM',
      platformUserId: '123456789',
    },
  },
});

if (!dealer) {
  // ❌ Not pre-registered
  return error('Dealer not found. Contact admin.');
}

if (!dealer.passwordHash) {
  // 🔐 No password yet → redirect to setup
  router.push('/dealerinterface/setup');
} else {
  // ✅ Password exists → redirect to dashboard
  router.push('/dealerinterface/dashboard');
}
```

---

### 4️⃣ First-Time Password Setup

**Route**: `/dealerinterface/setup`

**What dealer sees**:

```
┌─────────────────────────────┐
│   Настройка пароля          │
│                             │
│ Username: moscowmotors      │  (auto-filled or dropdown)
│ Password: [______]          │  (min 6 chars)
│ Confirm:  [______]          │
│                             │
│ [Установить пароль]         │
└─────────────────────────────┘
```

**Backend**: `/api/dealerinterface/setup-password`

```typescript
const { password } = body;
const { platform, userId } = validateWebAppRequest();

// Find dealer by platform + user ID
const dealer = await prisma.dealer.findUnique({
  where: {
    platform_platformUserId: {
      platform: 'TELEGRAM',
      platformUserId: userId,
    },
  },
});

// Hash password
const passwordHash = await hashPassword(password);

// Update dealer
await prisma.dealer.update({
  where: { id: dealer.id },
  data: { passwordHash },
});

// Create session
const token = createSessionToken(dealer);
setSessionCookie(token);

// Redirect to dashboard
return redirect('/dealerinterface/dashboard');
```

---

### 5️⃣ Dealer Logged In & Can Access Dashboard

**Route**: `/dealerinterface/dashboard`

**What's stored now**:

```sql
UPDATE Dealer SET
  platform = 'TELEGRAM',
  platformUserId = '123456789',
  platformChatId = '123456789',
  passwordHash = '$2b$12$...',  -- ← Now set
  updatedAt = now()
WHERE id = 'dealer_id';
```

**Session cookie**: `dealer_session=<token>` (HTTP-only, secure)

**Token payload**:

```json
{
  "dealerId": "dealer_id",
  "platform": "TELEGRAM",
  "platformUserId": "123456789",
  "iat": 1704067200,
  "exp": 1704672000
}
```

---

## Why This Design?

| Aspect             | Old (DEALER_CREDENTIALS)                   | New (Pre-registered)                     |
| ------------------ | ------------------------------------------ | ---------------------------------------- |
| **Registration**   | ❌ Admin puts username:password in env var | ✅ Admin creates account in UI           |
| **Scalability**    | ❌ Can't add dealers without redeploy      | ✅ Add dealers anytime                   |
| **Security**       | ❌ Passwords in .env, shared Basic Auth    | ✅ bcrypt hash, session token per dealer |
| **Auto-Detection** | ❌ Need to manually enter username         | ✅ Auto-detect from Telegram/MAX ID      |
| **Password Reset** | ❌ Can't reset, tied to env var            | ✅ Admin generates reset codes           |
| **Multi-Platform** | ❌ One credential per dealer               | ✅ Same dealer on MAX + Telegram         |

---

## Deprecated: DEALER_CREDENTIALS

### ❌ Old Approach (DON'T USE)

In `.env.local`:

```env
DEALER_CREDENTIALS="dealer1:dealer1,dealer2:dealer2"
```

Then dealer logs in with Basic Auth at `/dealer`:

```bash
curl -u dealer1:dealer1 http://localhost:3000/dealer/inquiries
```

**Problems**:

- ❌ Can't add dealers without editing .env
- ❌ Passwords exposed in env
- ❌ No bcrypt hashing
- ❌ Can't reset passwords
- ❌ No session management
- ❌ Not tied to Telegram/MAX ID
- ❌ Requires manual username/password entry

### ✅ New Approach (USE THIS)

1. Admin creates dealer in UI with **platform + user ID**
2. Dealer opens bot on phone
3. App auto-detects their platform + ID
4. Dealer sets password once
5. Session created automatically
6. Admin can reset password anytime with 6-digit code

---

## API Endpoints (New Flow)

### `POST /api/dealerinterface/setup-password`

**First-time password setup**

```
Headers: Authorization: <WebApp signature>
Body: { password: "string" }
Response: { sessionToken: "jwt" }
```

### `POST /api/dealerinterface/login`

**Subsequent logins** (if session expires)

```
Headers: Authorization: <WebApp signature>
Body: { password: "string" }
Response: { sessionToken: "jwt" }
```

### `POST /api/dealerinterface/reset-password`

**Password reset via admin-generated code**

```
Headers: Authorization: <WebApp signature>
Body: { code: "123456", newPassword: "string" }
Response: { sessionToken: "jwt" }
```

### `POST /api/admin/dealers/[id]/reset-password`

**Admin generates reset code**

```
Headers: Authorization: Basic <admin auth>
Response: { code: "123456", expiresAt: "timestamp" }
```

---

## Database Schema

### Dealer Table

```typescript
model Dealer {
  id                String      @id @default(cuid())
  username          String      @unique              // Simple identifier
  name              String?                          // Display name

  // Platform association (pre-registered by admin)
  platform          Platform?                        // TELEGRAM, MAX
  platformUserId    String?                          // Telegram/MAX user ID
  platformChatId    String?                          // For sending notifications

  // Authentication (set by dealer on first login)
  passwordHash      String?                          // bcrypt hash (null until set)

  // Contact
  phone             String?
  email             String?
  description       String?
  active            Boolean     @default(true)

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@unique([platform, platformUserId])  // Only one dealer per platform+ID
}

model PasswordResetCode {
  id        String      @id @default(cuid())
  dealerId  String
  dealer    Dealer      @relation(...)

  code      String      // 6-digit code (100000-999999)
  expiresAt DateTime    // 10 minutes from creation
  usedAt    DateTime?   // null until used

  createdAt DateTime    @default(now())
}
```

---

## Environment Variables (Actually Used)

**DEALER_CREDENTIALS is NOT used anymore.** Remove it if it exists.

**What's actually used**:

```env
# Admin credentials for dashboard
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Session management
SESSION_SECRET=<32+ char random string>

# Bot tokens (for sending notifications)
TG_BOT_TOKEN_DEALER=<token>
MAX_BOT_TOKEN_DEALER=<token>

# Bot names (for deep links)
TG_BOT_NAME_DEALER=autoauctiondealer_bot
MAX_BOT_NAME_DEALER=id5010035001_1_bot
```

---

## Testing This Flow

### Automated Test

```bash
bun run test:suite

# Creates:
#   1. Admin creates dealer with platform + ID
#   2. Dealer authenticates with session token
#   3. Password is set in database
```

### Manual Testing

```
Phone 1:
  1. Open @autoauctiondealer_bot
  2. Send /start
  3. Open mini-app
  4. App auto-detects Telegram ID
  5. Redirects to /dealerinterface/setup
  6. Set password
  7. Logged in!
```

---

## Migration Note

If you had the old `DEALER_CREDENTIALS` approach:

1. ✅ Remove `DEALER_CREDENTIALS` from .env
2. ✅ Remove `/dealer` routes (old portal)
3. ✅ Use `/dealerinterface` (new portal)
4. ✅ Admin creates dealers with platform + ID in UI
5. ✅ Dealers set passwords on first mini-app access
6. ✅ Use password reset codes for resets (admin → 6-digit code → dealer)

**The new system is WAY more secure and scalable.**
