# AGENTS.md - Development Guidelines

## Extremely important

- Consider docs/max_integration.txt before making any changes
- Start all coding sessions with `nvm use 22`
- Before committing, `bun run build` needs to succeed.
- Don't adjust tests if commit doesn't pass because of tests

## Project Overview

AutoAuction is a car inquiry/offer platform connecting buyers (via Max/Telegram) with dealers.

## Hint for running with node 20:

export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" && nvm use v20.19.6 && cd /Users/vlad/Documents/\_projects/\_glebproj/autoauction && pkill -f "next dev" 2>/dev/null; sleep 1; bun run dev > /tmp/next-dev.log 2>&1 &
sleep 5 && tail -50 /tmp/next-dev.log

## Important

- Do not commit unless specifically asked
- Do not push unless specifically asked
- Do not create more .mds unless specifically asked
  End messages with Files changed/added, lines affected, commit message (even if there is no commit)
  Always end with a brief (1-2 line) summary of changes / reasoning why.

## Tech Stack

- **Runtime**: Bun (use `bun` instead of `npm`/`yarn`)
- **Framework**: Next.js 16 with App Router
- **UI**: shadcn/ui components + Tailwind CSS v4
- **Database**: PostgreSQL via Prisma (Neon for MVP)
- **Deployment**: Vercel

## Commands

```bash
bun dev          # Start dev server
bun build        # Production build
bun lint         # Run ESLint
bun test         # Run tests
```

## Project Structure

```
src/
  app/                    # Next.js App Router
    page.tsx              # Landing page
    layout.tsx            # Root layout
    globals.css           # Global styles
    app/                  # Mini app routes (Max/TG WebView)
      page.tsx
      form/page.tsx
    dealer/               # Dealer dashboard
      page.tsx
      inquiries/
        page.tsx
        [id]/page.tsx
    api/                  # API routes
      inquiries/
      offers/
      webhooks/
  components/
    ui/                   # shadcn components
  lib/
    utils.ts              # Utility functions
    db.ts                 # Database client
    max.ts                # Max Messenger utilities
  types/
    index.ts              # TypeScript types
docs/
  plan.md                 # Project plan
```

## Coding Standards

- TypeScript strict mode
- ESLint with Airbnb-style rules
- Prettier for formatting
- Pre-commit hooks via husky + lint-staged

## Form Data - Model/Submodel Mapping

```typescript
const MODEL_SUBMODELS = {
  Granta: ['sedan', 'liftbek', 'khetchbek', 'universal', 'Cross', 'Drive Active'],
  Vesta: ['sedan', 'Cross', 'SW', 'SW Cross'],
  'Niva Travel': ['Niva Travel'],
  Largus: ['universal', 'Cross', 'furgon'],
  'Niva Legend': ['Niva Legend', 'Niva Legend Bronto'],
  Iskra: ['sedan', 'SW', 'SW Cross'],
  Aura: ['Aura'],
  Sportivnye: [
    'Vesta Sportline',
    'Vesta SW Sportline',
    'Granta Sportline',
    'Granta Sportline liftbek',
    'Granta Sport sedan',
    'Granta Sport liftbek',
  ],
} as const;

const STATUS_OPTIONS = [
  'Podderzhivayu rossiyskikh boytsov v zone SVO',
  'Uchastnik SVO / mobilizovannyy',
  'Semya uchastnika SVO',
  'Veteran boyevykh deystviy',
  'Drugoye',
] as const;

const TRANSMISSION_OPTIONS = ['Mekhanika', 'Avtomat', 'Ne vazhno'] as const;

const COLOR_OPTIONS = [
  'Belyy',
  'Chernyy',
  'Serebristyy',
  'Seryy',
  'Krasnyy',
  'Siniy',
  'Korichnevyy',
  'Drugoye',
] as const;
```

## Max Messenger Integration

Include the bridge library in mini app pages:

```html
<script src="https://st.max.ru/js/max-web-app.js"></script>
```

Access user data:

```typescript
// window.WebApp is available after script loads
const { initDataUnsafe, platform, version } = window.WebApp;
const userId = initDataUnsafe?.user?.id;
const userName = initDataUnsafe?.user?.name;
```

Key methods:

- `WebApp.ready()` - Signal app is ready
- `WebApp.close()` - Close mini app
- `WebApp.requestContact()` - Request phone number

Deep link format: `https://max.ru/<botName>?startapp=<payload>`

## Database Notes

MVP uses Neon Postgres. Production will migrate to Yandex Managed PostgreSQL.
Both are standard PostgreSQL - no special compatibility concerns.

## Authentication

- **Buyers**: Authenticated via Max/TG user ID (no password)
- **Dealers**: Basic Auth using DEALER_CREDENTIALS from .env.local
- **Admins**: Basic Auth using ADMIN_USERNAME/ADMIN_PASSWORD from .env.local

## Hardcoded Dealers System

### Overview
When users create inquiries via Max/Telegram, hardcoded dealers automatically receive notifications.

### Flow
1. User creates inquiry via Max/TG → 2. Hardcoded dealers get notified → 3. Dealers login at /dealer/inquiries → 4. Dealers make offers → 5. Admins see everything at /admin

### Configuration Files
- **src/lib/hardcoded-dealers.ts** - List of dealers who receive notifications
- **.env.local** - Dealer credentials for portal access

### Adding a New Hardcoded Dealer

1. Add credentials to .env.local:
```env
DEALER_CREDENTIALS="existing:pass,newdealer:newpass"
```

2. Add dealer to src/lib/hardcoded-dealers.ts:
```typescript
{
  username: 'newdealer',              // Must match .env credential username
  name: 'Dealer Display Name',
  platform: 'TELEGRAM',               // or 'MAX'
  platformUserId: 'TELEGRAM_USER_ID', // Get from @userinfobot on Telegram
  platformChatId: 'TELEGRAM_CHAT_ID', // Usually same as userId
  active: true,                       // Set false to disable notifications
}
```

3. Restart the application

### Getting Platform User IDs
- **Telegram**: Use @userinfobot or bot API getUpdates
- **MAX**: Capture from bot interaction logs

### Disabling Notifications
Set `active: false` in src/lib/hardcoded-dealers.ts. Dealer can still login but won't get auto-notifications.

### Notification Flow
- Triggered in src/app/api/inquiries/route.ts after inquiry creation
- Uses notifyDealerOfNewInquiry() from src/lib/notifications/index.ts
- Sent asynchronously (non-blocking)
- Errors logged but don't fail inquiry creation

## Complete User Flow

### 1. User Registration (Automatic)
- User opens mini-app in TG/MAX → WebApp SDK detects platform
- `src/app/app/page.tsx` extracts `initDataUnsafe.user.id` and `chat.id`
- Buyer record created/updated via upsert in `/api/inquiries` POST

### 2. Inquiry Creation
- User fills form at `/app/form` (name, phone, car details)
- POST to `/api/inquiries` creates inquiry with 24h expiry
- All hardcoded dealers notified via TG/MAX

### 3. Dealer Makes Offer
- Dealer logs in at `/dealer/inquiries` (Basic Auth)
- Views active inquiries (not expired)
- Submits offer via `/api/offers` POST
- Buyer notified via TG/MAX with deep link

### 4. User Accepts Offer (Lead Created)
- User clicks notification → opens offer detail page
- User clicks "Принять предложение"
- POST to `/api/leads` creates lead with buyer contact info
- Dealer notified via TG/MAX with buyer name + phone

### 5. Inquiry Expiration
- Inquiries expire after 24 hours (`expiresAt` field)
- Expired inquiries hidden from dealer list
- Offers rejected with HTTP 410 for expired inquiries

## MAX Bot Message Sending

### API Details
- **Endpoint**: `https://platform-api.max.ru/messages`
- **Auth**: `Authorization: <MAX_BOT_TOKEN>` (no Bearer prefix)
- **Chat ID**: Query param `?chat_id=<chatId>`
- **Body**: `{ "text": "..." }` for plain text

### Implementation: `src/lib/notifications/max.ts`
- `sendMaxMessage(chatId, text)` - Plain text message
- `sendMaxMessageWithButton(chatId, text, buttonText, startParam)` - With inline button

### Button with Deep Link
```typescript
body: JSON.stringify({
  text,
  attachments: [{
    type: 'inline_keyboard',
    payload: {
      buttons: [[{
        type: 'link',
        text: buttonText,
        url: `https://max.ru/${MAX_BOT_NAME}?startapp=${startParam}`
      }]]
    }
  }]
})
```

### Debug/Testing
- `/api/debug/max/send-test` (POST) - Send test message
- Requires `DEBUG_MAX_TEST_MESSAGE_ENABLED=true` or non-production env
- `/api/debug/max/ping` (GET) - Ping with random message

### Environment Variables
```env
MAX_BOT_TOKEN="your_token"
MAX_BOT_NAME="id5010035001_bot"
TG_BOT_TOKEN="your_tg_token"
TG_BOT_NAME="autoauction_bot"
```

## Key Files Reference

### User Flow
- `/src/app/app/page.tsx` - Entry point, platform detection
- `/src/app/app/form/page.tsx` - Inquiry form
- `/src/app/app/dashboard/page.tsx` - User's inquiries
- `/src/app/app/inquiry/[id]/offer/[offerId]/page.tsx` - Accept offer

### API Routes
- `/src/app/api/inquiries/route.ts` - Create inquiry
- `/src/app/api/offers/route.ts` - Create offer
- `/src/app/api/leads/route.ts` - Accept offer (create lead)

### Notifications
- `/src/lib/notifications/index.ts` - High-level notification service
- `/src/lib/notifications/max.ts` - MAX API
- `/src/lib/notifications/telegram.ts` - Telegram API
- `/src/lib/hardcoded-dealers.ts` - Dealer config

### Dealer Portal
- `/src/app/dealer/inquiries/page.tsx` - List inquiries
- `/src/app/dealer/inquiries/[id]/page.tsx` - Make offer

### Admin Portal
- `/src/app/admin/` - Full admin dashboard (all data visible)

## Bot Setup (Required for Mini-App to Work)

### Telegram Bot Setup
The "Something went wrong" error means the mini-app URL is not configured in BotFather.

1. Open @BotFather in Telegram
2. Send `/mybots` → select `autoauction_bot`
3. Bot Settings → Configure Mini App (or Menu Button)
4. Set the Web App URL to your deployed app:
   ```
   https://autoauction.vercel.app/app
   ```
5. Optionally set domain: `/setdomain` → select bot → enter domain

**Deep link format**: `https://t.me/autoauction_bot?startapp=<param>`

### MAX Bot Setup
The "Не нашли чат" error means the mini-app needs to be registered in MAX developer cabinet.

1. Go to MAX organization cabinet (requires verified Russian юрлицо)
2. Navigate to: Чат-бот и мини-приложение → Настроить
3. Enter the mini-app HTTPS URL:
   ```
   https://autoauction.vercel.app/app
   ```
4. Save and wait for moderation (up to 48h)

**Deep link format**: `https://max.ru/id5010035001_bot?startapp=<param>`

### Testing Message Sending
MAX messages work (as shown in your screenshot). To test:
```bash
curl -X POST "https://platform-api.max.ru/messages?chat_id=YOUR_CHAT_ID" \
  -H "Authorization: YOUR_MAX_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'
```

Or use the debug endpoint:
```bash
curl -X POST "http://localhost:3000/api/debug/max/send-test" \
  -H "Content-Type: application/json" \
  -d '{"chatId": "YOUR_CHAT_ID", "text": "Test"}'
```

## API Conventions

- All API routes under `/api/`
- JSON request/response bodies
- Standard HTTP status codes
- Dealer routes require auth header (MVP: Basic auth)
