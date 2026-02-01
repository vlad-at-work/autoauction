# AutoAuction Refactoring & Bot Integration Plan

## Phase 1: Critical Fixes (Day 1)
- [ ] Fix notification reliability in `/api/offers/route.ts` - use `Promise.allSettled()`
- [ ] Create centralized constants file (`@/lib/constants.ts`)
- [ ] Add rate limiting to auth endpoints
- [ ] Implement webhook identity system for Telegram and MAX
- [ ] Create `@/lib/max-commands.ts` for MAX API registration

## Phase 2: Bot Integration (Day 1-2)
- [ ] Refactor notification system to support webhook identities
- [ ] Implement Telegram webhook handler
- [ ] Implement MAX webhook handler
- [ ] Create bot initialization commands

## Phase 3: Security & Validation (Day 2-3)
- [ ] Add comprehensive Zod validation
- [ ] Implement audit logging
- [ ] Remove debug endpoints or protect them
- [ ] Add phone number validation

## Phase 4: Performance (Day 3-4)
- [ ] Add database indexes
- [ ] Implement pagination for inquiry lists
- [ ] Fix N+1 query problems
- [ ] Optimize dealer inquiries loading

## Phase 5: Architecture (Day 4-5)
- [ ] Migrate hardcoded dealers to database-driven system
- [ ] Refactor duplicate buyer creation logic
- [ ] Add retry logic for notifications
- [ ] Implement CSRF protection

---

## Detailed Implementation Steps

### PHASE 1A: Create Constants File

**File:** `src/lib/constants.ts`

Centralize all magic numbers and limits:
```typescript
export const INQUIRY_LIMITS = {
  MAX_PER_MONTH: 2,
  RESET_DAYS: 15,
} as const;

export const OFFER_LIMITS = {
  MAX_PER_DEALER_PER_INQUIRY: 5,
} as const;

export const TRANSACTION_LIMITS = {
  MAX_PER_INQUIRY: 3,
  MAX_PER_DEALER_PER_INQUIRY: 1,
} as const;

export const VALIDATION = {
  MAX_USERNAME_LENGTH: 50,
  MAX_PASSWORD_LENGTH: 100,
  PHONE_REGEX: /^\+?7\d{10}$/,
} as const;

export const WEBHOOK_TIMEOUT_MS = 2000;
export const AUTH_TIMEOUT_MIN = 5;
```

### PHASE 1B: Create Webhook Identity System

**File:** `src/lib/bot/webhook-identity.ts`

```typescript
export interface WebhookIdentity {
  id: string;
  platform: 'TELEGRAM' | 'MAX';
  botToken: string;
  webhookUrl: string;
  secret?: string; // For validation
  active: boolean;
  createdAt: Date;
  registeredAt?: Date;
}

export interface BotContext {
  identity: WebhookIdentity;
  event: any;
  timestamp: Date;
}
```

### PHASE 1C: Create MAX API Commands

**File:** `src/lib/max-commands.ts` (Exception to no-new-MD rule)

```typescript
import { CONSTANTS } from '@/lib/constants';

interface MaxApiCommand {
  method: 'POST' | 'GET' | 'DELETE';
  endpoint: string;
  description: string;
  body?: Record<string, any>;
  headers: Record<string, string>;
}

export function createMaxRegistrationCommands(
  botToken: string,
  webhookUrl: string,
  webhookSecret: string
): MaxApiCommand[] {
  return [
    {
      method: 'GET',
      endpoint: 'https://platform-api.max.ru/me',
      description: 'Verify bot token and get bot info',
      headers: { Authorization: botToken },
    },
    {
      method: 'POST',
      endpoint: 'https://platform-api.max.ru/subscriptions',
      description: 'Register webhook for receiving updates',
      body: { url: webhookUrl },
      headers: {
        Authorization: botToken,
        'Content-Type': 'application/json',
      },
    },
    {
      method: 'GET',
      endpoint: 'https://platform-api.max.ru/subscriptions',
      description: 'Check registered webhook status',
      headers: { Authorization: botToken },
    },
    {
      method: 'POST',
      endpoint: 'https://platform-api.max.ru/messages',
      description: 'Send test message to verify message sending works',
      body: {
        chat_id: 0, // Replace with test chat_id
        text: 'Test message from AutoAuction Bot',
      },
      headers: {
        Authorization: botToken,
        'Content-Type': 'application/json',
      },
    },
  ];
}

export async function registerMaxWebhook(
  botToken: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://platform-api.max.ru/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: botToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: webhookUrl }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function unregisterMaxWebhook(
  botToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://platform-api.max.ru/subscriptions', {
      method: 'DELETE',
      headers: { Authorization: botToken },
    });

    return { success: response.ok };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
```

### PHASE 1D: Fix Notification Reliability

**File:** `src/app/api/offers/route.ts` (Lines 96-104)

Change from:
```typescript
try {
  const result = await notifyBuyerOfNewOffer(...);
  if (!result.success) {
    console.error('Failed to send buyer notification:', result.error);
  }
} catch (err) {
  console.error('Failed to send buyer notification:', err);
}
```

To:
```typescript
await Promise.allSettled([
  notifyBuyerOfNewOffer(...),
  ...dealers.map((dealer) =>
    notifyDealerOfNewOffer(
      dealer,
      inquiry.model,
      inquiry.submodel,
      offer.price,
      inquiry.name,
      inquiry.phone
    )
  ),
]);
```

---

## PHASE 2: Bot Integration Architecture

### Telegram Webhook Handler

**File:** `src/app/api/webhooks/telegram/route.ts`

```typescript
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN!;
const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  // Verify secret token
  const secret = request.headers.get('x-telegram-bot-api-secret-token');
  if (secret !== TG_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
  }

  const update = await request.json();

  // Handle update
  if (update.message?.text === '/start') {
    // Handle start
    await handleTelegramStart(update.message);
  } else if (update.callback_query) {
    // Handle button clicks
    await handleTelegramCallback(update.callback_query);
  } else if (update.web_app_data) {
    // Handle WebApp data
    await handleTelegramWebAppData(update.web_app_data);
  }

  return NextResponse.json({ ok: true });
}

async function handleTelegramStart(message: any) {
  const chatId = message.chat.id;
  const userId = message.from.id;

  // Log user
  console.log(`Telegram user started bot: ${userId} (chat: ${chatId})`);

  // Send welcome message
  await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: 'Добро пожаловать в AutoAuction! Нажмите кнопку ниже, чтобы открыть приложение.',
      reply_markup: {
        inline_keyboard: [[{
          text: '📱 Открыть приложение',
          web_app: { url: process.env.NEXT_PUBLIC_APP_URL + '/app' },
        }]],
      },
    }),
  });
}

async function handleTelegramCallback(callbackQuery: any) {
  // Handle inline button presses
  console.log(`Telegram callback: ${callbackQuery.data}`);
}

async function handleTelegramWebAppData(webAppData: any) {
  // Handle data from WebApp
  console.log('Telegram WebApp data:', webAppData);
}
```

### MAX Webhook Handler

**File:** `src/app/api/webhooks/max/route.ts`

```typescript
import { NextResponse } from 'next/server';

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN!;

export async function POST(request: Request) {
  const update = await request.json();

  // Verify it's from MAX by checking structure
  if (!update.type || !update.object) {
    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  }

  switch (update.type) {
    case 'message_new':
      await handleMaxMessageNew(update.object.message);
      break;
    case 'message_callback':
      await handleMaxMessageCallback(update.object.callback);
      break;
    default:
      console.log(`Unknown MAX event type: ${update.type}`);
  }

  // Must respond quickly with 200 OK
  return NextResponse.json({ ok: true });
}

async function handleMaxMessageNew(message: any) {
  const chatId = message.chat.chat_id;
  const userId = message.from.user_id;
  const text = message.text;

  console.log(`MAX user message: ${userId} (chat: ${chatId}) - "${text}"`);

  if (text === '/start') {
    // Send welcome with mini-app button
    await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: 'Добро пожаловать в AutoAuction! Нажмите кнопку ниже.',
        reply_markup: {
          inline_keyboard: [[{
            text: 'Открыть приложение',
            type: 'open_app',
            app: { url: process.env.NEXT_PUBLIC_APP_URL + '/app' },
          }]],
        },
      }),
    });
  }
}

async function handleMaxMessageCallback(callback: any) {
  console.log(`MAX callback: ${callback.data}`);
}
```

---

## PHASE 2B: Refactor Notification System

**File:** `src/lib/notifications/index.ts` (refactored)

```typescript
import { BotContext } from '@/lib/bot/webhook-identity';

export async function notifyBuyerOfNewOffer(
  buyer: {
    platform: 'MAX' | 'TELEGRAM';
    platformChatId: string;
    platformUserId: string;
  },
  dealerName: string,
  model: string,
  submodel: string,
  price: number,
  isFirstOffer: boolean
): Promise<{ success: boolean; error?: string }> {
  const text = `
Новое предложение от ${dealerName}!

🚗 ${model} ${submodel}
💰 ${price.toLocaleString('ru-RU')} ₽

${isFirstOffer ? '🎉 Это первое предложение по вашей заявке!' : ''}

Посмотреть все предложения: ${process.env.NEXT_PUBLIC_APP_URL}
  `.trim();

  if (buyer.platform === 'TELEGRAM') {
    return await sendTelegramMessage(buyer.platformChatId, text);
  } else {
    return await sendMaxMessage(buyer.platformChatId, text);
  }
}

async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TG_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function sendMaxMessage(
  chatId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        Authorization: process.env.MAX_BOT_TOKEN!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chat_id: parseInt(chatId), text }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
```

---

## Database Schema Changes (Prisma)

**File:** `prisma/schema.prisma`

Add to support webhook identities:

```prisma
model WebhookIdentity {
  id        String   @id @default(cuid())
  platform  String   // "TELEGRAM" or "MAX"
  botToken  String   @unique
  webhookUrl String
  secret    String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  registeredAt DateTime?
  
  @@index([platform])
  @@index([active])
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  details   String?
  platform  String?
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

Add indexes:

```prisma
model Buyer {
  // ... existing fields
  
  @@index([platform, platformUserId])
  @@index([inquiryLimitResetAt])
}

model Inquiry {
  // ... existing fields
  
  @@index([expiresAt])
  @@index([buyerId])
  @@index([createdAt])
}

model Transaction {
  // ... existing fields
  
  @@index([inquiryId])
  @@index([dealerId])
  @@index([acceptedAt])
}
```

---

## Configuration

**Environment Variables to Add:**

```bash
# Telegram
TG_BOT_TOKEN=<from_botfather>
TG_WEBHOOK_SECRET=<generate_random>

# MAX
MAX_BOT_TOKEN=<from_max_cabinet>
MAX_WEBHOOK_SECRET=<generate_random>

# Webhooks
WEBHOOK_TELEGRAM_URL=https://yourdomain.com/api/webhooks/telegram
WEBHOOK_MAX_URL=https://yourdomain.com/api/webhooks/max

# Rate limiting
RATE_LIMIT_AUTH_PER_MINUTE=5
RATE_LIMIT_OFFERS_PER_HOUR=100

# Features
DEBUG_ENDPOINTS_ENABLED=false
AUDIT_LOGGING_ENABLED=true
CSRF_PROTECTION_ENABLED=true
```

---

## Summary of Changes

| File | Type | Changes |
|------|------|---------|
| `src/lib/constants.ts` | NEW | Centralized configuration |
| `src/lib/max-commands.ts` | NEW | MAX API registration |
| `src/lib/bot/webhook-identity.ts` | NEW | Webhook identity system |
| `src/app/api/webhooks/telegram/route.ts` | NEW | Telegram webhook handler |
| `src/app/api/webhooks/max/route.ts` | NEW | MAX webhook handler |
| `src/lib/notifications/index.ts` | REFACTOR | Support both bots, fix reliability |
| `src/app/api/offers/route.ts` | FIX | Use Promise.allSettled |
| `prisma/schema.prisma` | UPDATE | Add webhook identity, audit logs, indexes |

---

## Implementation Order

1. Create constants file
2. Create MAX commands file
3. Create webhook identity types
4. Create Telegram webhook handler
5. Create MAX webhook handler
6. Refactor notification system
7. Add database schema changes
8. Update environment variables
9. Test webhook registration
10. Test notification delivery
