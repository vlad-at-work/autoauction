# AGENTS.md - Development Guidelines

## Extremely important

- Start all coding sessions with `nvm use 22`
- Before committing, `bun run build` needs to succeed.

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
- **Dealers**: MVP uses hardcoded test/password
- Future: proper dealer auth system

## API Conventions

- All API routes under `/api/`
- JSON request/response bodies
- Standard HTTP status codes
- Dealer routes require auth header (MVP: Basic auth)
