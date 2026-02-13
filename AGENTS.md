# AutoAuction Project Context

## Current Status (as of Feb 13, 2025)

### What Works

1. **Buyer flow**: Users can create inquiries via mini-app, receive offers, accept them
2. **Admin panel**: Create dealers, manage inquiries, view transactions
3. **Dealer claiming via invite links**: New dealers can be claimed by clicking invite links
4. **MAX webhook**: Receives `bot_started` and `message_created` events
5. **Database migrations**: Status field removed, schema stable

### Recent Changes Made

1. Fixed MAX webhook payload format (`update_type` not `type`, `sender` not `from`, etc.)
2. Fixed invite link processing to handle `start_param` correctly (underscore format `claim_dealerId_token`)
3. Fixed session cookie handling - clears invalid sessions when dealer not found in DB
4. Changed MAX API calls to use `user_id` instead of `chat_id` for sending messages

### Known Issues

#### 1. Welcome Message Not Being Sent

**Problem**: When dealer clicks invite link, bot doesn't send welcome message.

**Root cause**: MAX API requires `user_id` parameter (not `chat_id`). Recently fixed but needs testing.

**Code location**: `src/app/api/webhooks/max/route.ts`

- `handleBotStarted()` - sends generic welcome
- `handleMessageCreated()` with `/start claim_xxx` - sends invite welcome with button

**Expected flow**:

1. User clicks invite link `?start=claim_dealerId_token`
2. MAX opens bot chat, sends `/start claim_dealerId_token`
3. Webhook receives `message_created` event
4. Bot sends welcome message with "Open App" button containing `?startapp=claim_dealerId_token`
5. User clicks button → mini-app opens → claim flow begins

#### 2. Cookie/Session Edge Cases

**Problem**: After DB wipe, old session cookies cause issues.

**Status**: Partially fixed. Check endpoint now verifies dealer exists before returning `authenticated`. If dealer gone, continues to claim flow.

### Testing Notes

- Phone 1 (userId: 20325912) - Tested, can claim dealers
- Phone 2 (userId: 171964362) - Tested, can claim dealers
- Each invite link should work once (dealer claimed by first user)
- After DB wipe, need to test fresh claim flow

### Architecture

#### Invite Flow

```
Admin creates dealer → generates invite link
    ↓
Link: https://max.ru/BOTNAME?start=claim_dealerId_token
    ↓
User clicks → MAX opens bot → /start command sent
    ↓
Webhook → sends welcome with button → user clicks
    ↓
Mini-app opens with ?startapp=claim_dealerId_token
    ↓
Frontend reads start_param → calls /api/dealerinterface/check
    ↓
API validates claim token → binds dealer → returns needs_setup
    ↓
User sets password → setup complete → dashboard
```

#### Key Files

- `src/app/api/webhooks/max/route.ts` - MAX webhook handler
- `src/app/api/dealerinterface/check/route.ts` - Dealer auth check & claim
- `src/app/dealerinterface/page.tsx` - Entry point, reads start_param
- `src/lib/auth/dealer-claim.ts` - Claim token create/validate

#### Environment Variables (Vercel)

- `MAX_BOT_TOKEN` / `MAX_BOT_TOKEN_DEALER` - Bot tokens
- `MAX_BOT_NAME` / `MAX_BOT_NAME_DEALER` - Bot usernames
- `SESSION_SECRET` - For claim tokens

### Debugging

Logs use `console.warn` (not console.log) to show in Vercel.

### Next Steps / TODO

1. **Test welcome message**: Verify `user_id` fix works, messages are sent
2. **Monitor claim flow**: Ensure invite links work end-to-end
3. **Consider**: Should we add retry logic for message sending?
4. **Consider**: Better error handling when bot can't message user
