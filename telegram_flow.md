Plan: Add Telegram Bot Support (Mirror MAX Flow)

## Context

The MAX messenger bot flow is fully working: dealer invites via `?start=TOKEN`, webhook handling, welcome messages with `open_app` buttons, deep-link notifications for inquiries/offers/acceptances, and buyer notifications. Telegram needs an identical flow. The infrastructure is ~70% ready — both SDKs load in layouts, `webapp-validation.ts` already validates Telegram initData, `detectPlatform()` detects both platforms, the Prisma schema has `Platform` enum with `TELEGRAM`, and all TG env vars are in `.env.local`. What's missing: a message sender, a webhook handler, notification routing for Telegram users, and invite URL generation.

### Env vars already configured in `.env.local`:

```
TG_BOT_TOKEN="7722495522:..."           # Customer bot
TG_BOT_TOKEN_DEALER="8427848973:..."     # Dealer bot
TG_BOT_NAME="autoauction_bot"
TG_BOT_NAME_DEALER="autoauctiondealer_bot"
TG_WEBHOOK_SECRET="d5ad04d0..."
TG_DEALER_WEBHOOK_SECRET="a82236ec..."
NEXT_PUBLIC_TELEGRAM_BOT_NAME="autoauction_bot"
```

### Key difference: MAX vs Telegram

| Aspect                       | MAX                                                                                                     | Telegram                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| API base                     | `https://platform-api.max.ru`                                                                           | `https://api.telegram.org/bot{TOKEN}`                                            |
| Auth                         | `Authorization: {token}` header                                                                         | Token in URL path                                                                |
| Send message                 | `POST /messages?user_id=X` with JSON body                                                               | `POST /bot{TOKEN}/sendMessage` with `chat_id` in body                            |
| Mini-app button              | `attachments[].type: "inline_keyboard"`, button `type: "open_app"`, `web_app: botName`, `payload: data` | `reply_markup.inline_keyboard[][]`, button has `web_app: { url: "https://..." }` |
| Deep link via button payload | `payload` field → arrives as `?startapp=PAYLOAD`                                                        | `web_app.url` includes `?startapp=PAYLOAD` directly in the URL                   |
| `/start` param               | `bot_started` event, param in `update.payload`                                                          | Message with `text: "/start PARAM"`, parse after `/start `                       |
| Webhook verification         | None (or custom)                                                                                        | `X-Telegram-Bot-Api-Secret-Token` header                                         |

### Existing infrastructure (NO changes needed)

- `src/app/app/webapp-ready.tsx` — `detectPlatform()` returns `'telegram'`, `getWebApp()` reads `window.Telegram.WebApp`
- `src/lib/auth/webapp-validation.ts` — validates TG initData with HMAC-SHA256 using `TG_BOT_TOKEN` / `TG_BOT_TOKEN_DEALER`
- `src/app/dealerinterface/layout.tsx` + `src/app/app/layout.tsx` — both load Telegram SDK script
- `src/app/dealerinterface/page.tsx` — platform detection + deep link routing works for both platforms
- `src/app/app/page.tsx` — buyer entry with deep link parsing works for both platforms
- `prisma/schema.prisma` — `Platform` enum has `TELEGRAM`
- `src/lib/deeplinks.ts` — `parseStartParam()` uses `_` separator (MAX-safe)
- `src/lib/constants.ts` — has `API_ENDPOINTS.TELEGRAM_BASE`
- `scripts/webhooks/register-telegram.sh` — ready-made webhook registration script

---

## Phase 1: Create Telegram Message Sender

**New file:** `src/lib/notifications/telegram.ts`

Mirror `src/lib/notifications/max.ts` structure. Key differences:

```typescript
const TG_API_BASE = 'https://api.telegram.org';
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_BOT_TOKEN_DEALER = process.env.TG_BOT_TOKEN_DEALER || '';

export type TelegramButton = {
  text: string;
  web_app: { url: string };
};

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  buttons?: TelegramButton[],
  botType: 'customer' | 'dealer' = 'customer'
): Promise<{ success: boolean; error?: string }>;
```

- Endpoint: `POST ${TG_API_BASE}/bot${token}/sendMessage`
- Body: `{ chat_id, text, parse_mode: 'HTML', reply_markup?: { inline_keyboard: [[...buttons]] } }`
- Button format: `{ text: "Button text", web_app: { url: "https://domain.com/app?startapp=PAYLOAD" } }`
- The `web_app` URL must be a full HTTPS URL to the mini-app. For deep links, append `?startapp=PAYLOAD` to the URL.
- Need a helper to construct the mini-app URL: `getAppUrl(path, startapp?)` using `process.env.NEXT_PUBLIC_APP_URL` or `VERCEL_PROJECT_PRODUCTION_URL`

**Reference:** `src/lib/notifications/max.ts` (copy structure, adapt API format)

---

## Phase 2: Create Telegram Webhook Handler

**New file:** `src/app/api/webhooks/telegram/route.ts`

Mirror `src/app/api/webhooks/max/route.ts` logic. Key differences:

### Webhook verification

```typescript
const secret =
  botType === 'dealer' ? process.env.TG_DEALER_WEBHOOK_SECRET : process.env.TG_WEBHOOK_SECRET;
const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
if (secret && headerSecret !== secret) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### Parsing the update

Telegram sends a different payload structure than MAX:

```typescript
// Telegram update structure:
{
  update_id: number,
  message?: {
    message_id: number,
    from: { id: number, first_name: string, ... },
    chat: { id: number, type: string },
    text: string,       // "/start TOKEN"
    entities?: [{ type: "bot_command", offset: 0, length: 6 }]
  }
}
```

Extract:

- `chatId` from `update.message.chat.id`
- `userId` from `update.message.from.id`
- `firstName` from `update.message.from.first_name`
- `/start` param: if `text` starts with `/start `, extract everything after `/start `

### Route: `POST /api/webhooks/telegram?bot=customer|dealer`

Handle `/start PARAM`:

- **Dealer bot + 6-digit code or `setup_` prefix** → `handleDealerInviteTelegram()` — same logic as MAX: look up dealer by `inviteToken`, send welcome + `web_app` button pointing to dealer mini-app with `?startapp=TOKEN`
- **Dealer bot + no param** → generic dealer welcome message
- **Customer bot + any** → customer welcome message

**Reference:** `src/app/api/webhooks/max/route.ts` (copy logic, adapt payload parsing)

---

## Phase 3: Route Notifications to Telegram

**File:** `src/lib/notifications/index.ts`

Currently every function has `if (platform !== 'MAX') return { success: true }`. Change to support both:

```typescript
import { sendTelegramMessage, type TelegramButton } from './telegram';
```

Add Telegram bot name constants:

```typescript
const TG_BOT_NAME = process.env.TG_BOT_NAME || process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || '';
const TG_BOT_NAME_DEALER = process.env.TG_BOT_NAME_DEALER || '';
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'localhost:3000'}`;
```

For each notification function, add a Telegram branch alongside the existing MAX branch:

### Pattern for each function:

```typescript
if (buyer.platform === 'MAX') {
  // existing MAX code (unchanged)
} else if (buyer.platform === 'TELEGRAM') {
  // same text, same logic
  // buttons use TelegramButton format with web_app URL instead of MAX open_app payload
  const buttons: TelegramButton[] = [
    {
      text: 'Открыть заявку',
      web_app: { url: `${APP_URL}/dealerinterface?startapp=inquiry_${inquiryId}` },
    },
  ];
  return sendTelegramMessage(dealer.platformUserId, text, buttons, 'dealer');
}
return { success: true }; // unknown platform
```

### Functions to update (all 5):

1. `notifyBuyer` — text only, no buttons (same for both)
2. `notifyBuyerOfNewOffer` — button URL: `${APP_URL}/app?startapp=offer_${inquiryId}_${offerId}`
3. `notifyDealerOfNewInquiryViaBot` — button URL: `${APP_URL}/dealerinterface?startapp=inquiry_${inquiryId}`
4. `notifyDealerOfAcceptedOfferViaBot` — button URL: `${APP_URL}/dealerinterface?startapp=accepted_${inquiryId}`
5. `sendDealerPasswordResetCode` — text only, no buttons

---

## Phase 4: Generate Telegram Invite URLs

### 4a. Invite API

**File:** `src/app/api/admin/dealers/[id]/invite/route.ts`

Add TG bot name reading and return both URLs:

```typescript
const TG_BOT_NAME_DEALER = process.env.TG_BOT_NAME_DEALER || '';

const maxInviteUrl = `https://max.ru/${MAX_BOT_NAME_DEALER}?start=${token}`;
const tgInviteUrl = TG_BOT_NAME_DEALER ? `https://t.me/${TG_BOT_NAME_DEALER}?start=${token}` : null;

return NextResponse.json({
  ok: true,
  inviteToken: token,
  inviteTokenExpiresAt: expiresAt,
  inviteUrl: maxInviteUrl, // backward compat
  maxInviteUrl,
  tgInviteUrl,
});
```

### 4b. Admin invite UI

**File:** `src/components/admin/dealer-invite-section.tsx`

- Store both `maxInviteUrl` and `tgInviteUrl` from API response
- Show two URL sections with separate copy buttons, labeled "MAX" and "Telegram"
- Change card title from "Invite Link (MAX)" to "Invite Links"

---

## Phase 5: Register Webhooks

After deploying, register the Telegram webhooks using the existing scripts:

**Customer bot:**

```bash
export TG_BOT_TOKEN="7722495522:..."
export TG_WEBHOOK_SECRET="d5ad04d0..."
./scripts/webhooks/register-telegram.sh "https://autoauction-two.vercel.app/api/webhooks/telegram?bot=customer" "$TG_WEBHOOK_SECRET"
```

**Dealer bot:**

```bash
export TG_BOT_TOKEN="8427848973:..."  # dealer token
export TG_WEBHOOK_SECRET="a82236ec..."  # dealer secret
./scripts/webhooks/register-telegram.sh "https://autoauction-two.vercel.app/api/webhooks/telegram?bot=dealer" "$TG_WEBHOOK_SECRET"
```

---

## Files Summary

| Action   | File                                             | Description                                           |
| -------- | ------------------------------------------------ | ----------------------------------------------------- |
| **NEW**  | `src/lib/notifications/telegram.ts`              | Telegram message sender (mirrors `max.ts`)            |
| **NEW**  | `src/app/api/webhooks/telegram/route.ts`         | Telegram webhook handler (mirrors `max/route.ts`)     |
| **EDIT** | `src/lib/notifications/index.ts`                 | Add Telegram branches to all 5 notification functions |
| **EDIT** | `src/app/api/admin/dealers/[id]/invite/route.ts` | Return both MAX and TG invite URLs                    |
| **EDIT** | `src/components/admin/dealer-invite-section.tsx` | Show both invite links with copy buttons              |

## Files NOT changed (already working for both platforms)

- `src/app/app/webapp-ready.tsx` — detects both
- `src/lib/auth/webapp-validation.ts` — validates both
- `src/app/dealerinterface/page.tsx` — handles both + deep links
- `src/app/app/page.tsx` — buyer entry with deep links
- `src/lib/deeplinks.ts` — platform-agnostic
- Both layouts — load both SDKs
- All API routes — platform-aware via validation result

---

## Verification

1. **Webhook registration:** Run registration scripts for both bots, verify with `info-telegram.sh`
2. **Customer bot `/start`:** Open `https://t.me/autoauction_bot?start=test` → should receive welcome message
3. **Dealer invite flow:** Generate invite in admin → copy TG link → open in Telegram → bot sends welcome with "Открыть панель дилера" web_app button → tap → mini-app opens with token → set password → see inquiries
4. **Dealer notifications:** Create inquiry as buyer → dealer (registered via TG) receives message with "Открыть заявку" button → tap → opens inquiry detail in mini-app
5. **Buyer notifications:** Dealer submits offer → buyer (registered via TG) receives message with "Посмотреть предложение" button
6. **Accepted offer:** Buyer accepts → dealer gets message with buyer contact + "Открыть сделку" button → deep-links to inquiry detail
