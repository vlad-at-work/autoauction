# New Dealer Authentication System - Implementation Plan

## Overview

Based on MAX platform constraints (from `max_research.txt`) and lessons learned from the previous broken implementation, this document outlines a secure, simple dealer authentication system.

## Core Principles

1. **One link = one dealer** - Each invite link is tied to a specific dealer record
2. **Password before assignment** - Dealer sets password first, platform binding happens after
3. **Race condition acceptable** - First person to use the link wins (if shared)
4. **No session persistence** - State stored in DB, validated on every request
5. **Deleted dealers = dead links** - If dealer is deleted, link stops working immediately

---

## MAX Platform Constraints (Critical)

### The "First Message" Problem
- Bot **CANNOT** send welcome message until user sends first message
- Chat starts in `suspended` state
- `bot_started` webhook fires when user sends `/start` command
- Payload (`start` param) delivered WITH the first message

### Flow Imposed by MAX
```
User clicks invite link → Chat opens (suspended) → User types /start → 
Bot receives bot_started + payload → Bot sends welcome message → 
User clicks mini-app button → WebApp opens with initData
```

We CANNOT change this flow. We MUST work within it.

---

## Proposed Authentication Flow

### Step 1: Admin Creates Dealer

Admin creates dealer in admin panel:
- Username (unique, required)
- Name, phone, email (required)
- Description
- No platform data stored yet

Database state:
```sql
INSERT INTO dealers (id, username, name, ..., platform, platformUserId, platformChatId, passwordHash)
VALUES ('dealer_123', 'VladDealerio', ..., NULL, NULL, NULL, NULL)
```

### Step 2: Generate Invite Link

Admin clicks "Generate Invite Link" on dealer detail page:

```typescript
// Server-side
const token = generateSecureToken(); // 32 bytes, URL-safe base64
await prisma.dealer.update({
  where: { id: dealerId },
  data: { inviteToken: token, inviteTokenExpiresAt: now + 7_days }
});

const inviteLink = `https://max.ru/BOT_NAME?start=auth_${dealerId}_${token}`;
```

Link format: `https://max.ru/{botName}?start=auth_{dealerId}_{token}`

### Step 3: User Receives and Clicks Link

1. User gets link (SMS, email, admin sends directly)
2. User clicks link → MAX opens chat with bot
3. Chat is in `suspended` state - bot CANNOT message yet
4. User sees empty chat (or bot description)

### Step 4: User Sends /start

1. User types `/start` or clicks button (MAX may show "Start" button)
2. MAX delivers `bot_started` webhook:

```json
{
  "update_type": "bot_started",
  "timestamp": 1234567890,
  "user": { "user_id": 171964362, "first_name": "Vlad" },
  "chat": { "chat_id": 171964362 },
  "start_payload": "auth_dealer_123_abc123..."
}
```

### Step 5: Bot Sends Welcome with Mini-App Button

Webhook handler responds with welcome message:

```typescript
// /api/webhooks/max/route.ts
if (update.update_type === 'bot_started' && update.start_payload?.startsWith('auth_')) {
  const [_, dealerId, token] = update.start_payload.split('_');
  
  // Validate token exists and not expired
  const dealer = await prisma.dealer.findUnique({
    where: { id: dealerId, inviteToken: token, inviteTokenExpiresAt: { gt: new Date() } }
  });
  
  if (!dealer) {
    await sendMaxMessage(userId, 'Ссылка устарела или недействительна. Обратитесь к администратору.');
    return;
  }
  
  // Send welcome with mini-app button
  await sendMaxMessage(userId, 
    `👋 Добро пожаловать, ${dealer.name}!\n\n` +
    `Нажмите кнопку ниже, чтобы активировать аккаунт дилера:`,
    [{
      type: 'inline_keyboard',
      payload: {
        buttons: [[{
          type: 'open_app',
          text: '🚀 Активировать аккаунт',
          app_name: BOT_NAME,
          payload: `setup_${dealerId}_${token}`  // Pass token again for validation
        }]]
      }
    }]
  );
}
```

### Step 6: User Opens Mini-App

1. User clicks button → Mini-app opens
2. WebApp receives `initData` with `start_param`: `setup_dealer_123_abc123...`
3. Frontend calls `/api/dealerinterface/setup-check`:

```typescript
// POST /api/dealerinterface/setup-check
const { dealerId, token } = parseStartParam(startParam);

const dealer = await prisma.dealer.findUnique({
  where: { 
    id: dealerId, 
    inviteToken: token,
    inviteTokenExpiresAt: { gt: new Date() },
    deletedAt: null
  }
});

if (!dealer) {
  return { status: 'invalid_link' };
}

// Check if already claimed by someone else
if (dealer.platform && dealer.platformUserId) {
  // Dealer already claimed - check if it's the same user
  if (dealer.platformUserId !== currentUserId) {
    return { status: 'already_claimed' };
  }
  // Same user returning
  if (dealer.passwordHash) {
    return { status: 'needs_login' };
  }
  return { status: 'needs_password' };  // Started but didn't finish
}

// Fresh claim - return dealer info for display
return { 
  status: 'needs_setup', 
  dealer: { id: dealer.id, name: dealer.name, username: dealer.username }
};
```

### Step 7: User Sets Password

1. User sees "Set Password" screen
2. User enters password twice
3. Frontend calls `/api/dealerinterface/claim`:

```typescript
// POST /api/dealerinterface/claim
const { dealerId, token, password, initData } = body;

// 1. Validate WebApp initData (platform, userId)
const validation = validateWebAppRequest(initData);
if (!validation.valid) return 401;

// 2. Validate token
const dealer = await prisma.dealer.findUnique({
  where: { 
    id: dealerId, 
    inviteToken: token,
    inviteTokenExpiresAt: { gt: new Date() },
    deletedAt: null
  }
});
if (!dealer) return { error: 'Invalid or expired link' };

// 3. Check if already claimed by someone else (race condition check)
if (dealer.platform && dealer.platformUserId && dealer.platformUserId !== validation.userId) {
  return { error: 'This link has already been used by someone else' };
}

// 4. Hash password
const passwordHash = await bcrypt.hash(password, 12);

// 5. Atomic update: claim + set password
await prisma.dealer.update({
  where: { id: dealerId },
  data: {
    platform: validation.platform === 'max' ? 'MAX' : 'TELEGRAM',
    platformUserId: validation.userId,
    platformChatId: validation.chatId || validation.userId,
    passwordHash: passwordHash,
    inviteToken: null,  // Invalidate token
    inviteTokenExpiresAt: null
  }
});

// 6. Create session
const sessionToken = createSessionToken(dealerId, validation.platform, validation.userId);

return { 
  success: true, 
  sessionToken,
  redirectTo: '/dealerinterface/dashboard'
};
```

### Step 8: Subsequent Logins

Dealer returns to bot:
1. User opens bot chat (already `active` state from previous interaction)
2. User clicks "Open Dealer Panel" button (pinned message or types /start)
3. Mini-app opens with `initData`
4. Frontend calls `/api/dealerinterface/check`:

```typescript
// POST /api/dealerinterface/check
const validation = validateWebAppRequest(initData);

// Find dealer by platform credentials
const dealer = await prisma.dealer.findUnique({
  where: {
    platform_platformUserId: {
      platform: validation.platform,
      platformUserId: validation.userId
    }
  }
});

if (!dealer || dealer.deletedAt) {
  return { status: 'not_dealer' };
}

if (!dealer.passwordHash) {
  return { status: 'incomplete_setup' };
}

// Valid dealer - create session
const sessionToken = createSessionToken(dealer.id, validation.platform, validation.userId);
return { status: 'authenticated', sessionToken };
```

---

## Key Differences from Previous (Broken) Implementation

| Aspect | Old (Broken) | New (Proposed) |
|--------|-------------|----------------|
| Session validation | Checked cookie only, no DB lookup | DB lookup on every request |
| Dealer deletion | Ghost sessions persisted | Immediate cutoff (DB lookup fails) |
| Claim flow | Auto-claim with fallback | Explicit password-before-claim |
| Token expiry | None | 7 days, then nullified |
| Race condition | Handled (rejected) | Accepted (first wins) |
| Welcome message | Failed (chat.denied) | Works (waits for /start) |

---

## Security Considerations

### Session Management
- Session tokens are short-lived (24 hours)
- Each API call validates against DB
- If dealer is deleted, all sessions immediately invalid
- Password reset invalidates all existing sessions

### Token Security
- Invite tokens are single-use (nullified after claim)
- Tokens expire after 7 days
- Tokens are 256-bit random values (URL-safe base64)
- Failed attempts don't reveal if dealer exists

### Race Conditions
- If two people click same link simultaneously: first to submit password wins
- Second person gets "already claimed" error
- This is acceptable behavior per requirements

### MAX Platform Limitations
- Bot cannot proactively message users
- Welcome only sent after user sends /start
- Payload only delivered with first message
- We must store dealer info in link (dealerId + token)

---

## Database Schema Changes

```sql
-- Add to Dealer table
ALTER TABLE dealers ADD COLUMN invite_token TEXT;
ALTER TABLE dealers ADD COLUMN invite_token_expires_at TIMESTAMP;
ALTER TABLE dealers ADD COLUMN password_hash TEXT;

-- Existing columns remain: platform, platform_user_id, platform_chat_id

-- Index for faster lookup
CREATE INDEX idx_dealers_invite_token ON dealers(invite_token) WHERE invite_token IS NOT NULL;
```

---

## API Endpoints

### New Endpoints

```
POST /api/webhooks/max
  - Handle bot_started with start_payload
  - Send welcome message with mini-app button

POST /api/dealerinterface/setup-check
  - Validate invite token
  - Return dealer info for setup screen
  - Body: { startParam, initData }

POST /api/dealerinterface/claim
  - Set password + claim dealer account
  - Body: { dealerId, token, password, initData }

POST /api/dealerinterface/check
  - Check existing dealer status
  - Body: { initData }

POST /api/dealerinterface/login
  - Password login for returning dealers
  - Body: { initData, password }

POST /api/dealerinterface/logout
  - Clear session
```

### Protected Endpoints (require valid session)

```
GET  /api/dealerinterface/inquiries
POST /api/dealerinterface/offer
GET  /api/dealerinterface/my-info
```

---

## Frontend Pages

```
/dealerinterface
  - Checks initData
  - If authenticated → redirect to dashboard
  - If needs_setup → redirect to setup
  - If needs_login → redirect to login
  - If invalid → show error

/dealerinterface/setup?startapp=setup_{dealerId}_{token}
  - Show dealer name
  - Password input (x2)
  - Submit to claim endpoint

/dealerinterface/login
  - Password input
  - Submit to login endpoint

/dealerinterface/dashboard
  - Protected, requires session
  - Show inquiries, offers, etc.
```

---

## Admin Changes

```
/admin/dealers/[id]
  - Remove: Invite links component
  - Add: "Generate Invite Link" button
  - Add: "Regenerate Link" button (invalidates old)
  - Show: Current link status (active/expired/used)
```

---

## Migration Path

1. Deploy new schema (add invite_token columns)
2. Deploy new API endpoints
3. Deploy new frontend pages
4. Update webhook handler
5. Test with new dealer
6. Migrate existing dealers (admin regenerates links)
7. Remove old auth code

---

## Open Questions

1. **Password requirements?** (min length, complexity)
2. **Session duration?** (24 hours? 7 days?)
3. **Invite token expiry?** (7 days? 30 days?)
4. **Rate limiting?** (attempts per token, per IP)
5. **Password reset?** (how does admin trigger?)
6. **Multiple devices?** (same dealer on phone + tablet)

---

## Implementation Phases

### Phase 1: Foundation
- Database migration (invite_token columns)
- Webhook handler for `bot_started`
- Token generation in admin

### Phase 2: Claim Flow
- Setup check endpoint
- Claim endpoint with password
- Setup page frontend

### Phase 3: Login Flow
- Check endpoint
- Login endpoint
- Login page frontend

### Phase 4: Protected Routes
- Session middleware
- Inquiries API
- Dashboard page

### Phase 5: Polish
- Error handling
- Rate limiting
- Admin UI improvements
