# MAX Platform Deep Research Query

## Research Objective

Understand MAX messenger platform's bot architecture, invite flows, and messaging permissions to fix welcome message delivery.

## Search Query for Kimi DeepSearch

```
MAX messenger platform bot API documentation messaging permissions chat states

MAX platform bot invite link flow start parameter deep linking

MAX messenger webhook events bot_started message_created conversation_opened

MAX API chat.denied error dialog.suspended permission user messaging

MAX platform vs Telegram bot differences invite link behavior

MAX messenger mini-app integration bot chat establishment first message

MAX platform bot proactive messaging user requirements conversation state

Russian messenger MAX API documentation макс мессенджер бот api

MAX platform "error.dialog.suspended" solution workaround

MAX messenger bot welcome message first contact user initiates
```

## Specific Questions to Answer

### 1. Chat State Machine

- What states can a MAX bot-user conversation be in?
- What triggers "dialog.suspended" state?
- How does conversation move from "suspended" to "active"?
- Can a bot send ANY message before user sends first message?

### 2. Invite Link Behavior

- What happens when user clicks `max.ru/botname?start=param`?
- Does this automatically send `/start` to bot?
- What webhook events fire (sequence matters)?
- Is there a difference between first-time and returning user?

### 3. Webhook Event Documentation

- Complete list of MAX webhook events
- `bot_started` - when does it fire exactly?
- `message_created` - does it fire for `/start` from invite link?
- Any events related to "conversation opened" or "chat established"?

### 4. API Permissions

- `/messages` endpoint requirements
- What authentication/authorization is needed?
- `user_id` vs `chat_id` - which to use when?
- Rate limits and restrictions

### 5. Comparison with Telegram

- How is MAX different from Telegram bot API?
- What works in Telegram but not in MAX?
- Invite link behavior differences

### 6. Workarounds and Solutions

- How do other MAX bots handle welcome messages?
- Is there a way to prompt user to send first message?
- Can mini-app show welcome screen without bot message?

## Expected Artifacts

Save findings to:

- `docs/MAX_CHAT_STATES.md` - Conversation state diagram
- `docs/MAX_INVITE_FLOW.md` - Exact event sequence
- `docs/MAX_VS_TELEGRAM.md` - Key differences
- `docs/MAX_SOLUTION.md` - Recommended approach

## Key URLs to Find

- MAX API documentation (dev.max.ru)
- MAX bot platform docs
- GitHub examples of working MAX bots
- StackOverflow/similar issues

## Success Criteria

Understand exactly:

1. Why `chat.denied` error occurs
2. What event sequence happens when invite link clicked
3. Whether bot CAN or CANNOT send first message
4. Best practice for MAX bot welcome flow
5. If mini-app should handle welcome instead of bot
