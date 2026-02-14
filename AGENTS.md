# AutoAuction Project Context

## Critical Directive (Feb 13, 2025)

**SIMPLIFIED DEALER FLOW - CURRENT PRIORITY**

The ONLY goal right now is a working dealer login flow:

1. Admin creates dealer and generates invite link
2. Dealer clicks link and logs in somehow
3. Dealer sees inquiries (empty list is fine)

**Constraints:**

- NO notification bells and whistles
- NO rate limiting
- NO race condition handling
- NO security hardening beyond basics
- Tests are OPTIONAL before commit (can be skipped)

The flow must work for sanity. Everything else is secondary.

---

## Current Status

### What Works

1. **Buyer flow**: Users can create inquiries via mini-app
2. **Admin panel**: Create dealers, generate invite links
3. **Database**: Schema supports dealer auth

### What Needs Fixing

**Dealer invite flow is BROKEN:**

- Dealer clicks link → sees "Do you want to open this chat?" → opens → nothing happens
- Typing `/start` does nothing
- Opening app shows "Not registered"

**Root cause**: Bot messages not working, webhook events not firing properly.

**Solution**: Bypass bot messaging entirely. Dealer should be able to:

1. Click link → MAX opens chat
2. Click "Open App" button (or type /start to get button)
3. App opens with invite token in URL
4. Setup password → Done

---

## Simplified Flow (Target)

```
Admin creates dealer → generates invite link
    ↓
Link: https://max.ru/BOTNAME?start=setup_dealerId_token
    ↓
Dealer clicks → MAX opens chat
    ↓
Dealer clicks "Open App" button (or types /start)
    ↓
Mini-app opens with ?startapp=setup_dealerId_token
    ↓
Frontend detects token → shows setup screen
    ↓
Dealer sets password → account bound → dashboard
```

**Key change**: Don't depend on bot welcome message. Go directly to setup.

---

## Key Files

- `src/app/api/webhooks/max/route.ts` - MAX webhook handler
- `src/app/dealerinterface/page.tsx` - Entry point, handles invite detection
- `src/app/dealerinterface/setup/page.tsx` - Password setup
- `src/lib/notifications/max.ts` - MAX messaging (currently broken, not critical)

---

## Environment Variables (Vercel)

- `MAX_BOT_TOKEN` / `MAX_BOT_TOKEN_DEALER` - Bot tokens
- `MAX_BOT_NAME` / `MAX_BOT_NAME_DEALER` - Bot usernames

---

## Debugging

Logs use `console.warn` to show in Vercel.

Webhook events will appear in Vercel logs when received.

---

## Testing

Tests can be skipped during development. Pre-commit hook runs them but they can be bypassed if needed.

To run manually: `bun run test`

Build must still pass: `bun run build`
