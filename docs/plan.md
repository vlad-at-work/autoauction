# AutoAuction - Project Plan

## Overview

A proof-of-concept auto sales platform where:

1. Users submit car purchase inquiries via Max/Telegram mini-apps
2. Dealers view inquiries and submit competitive offers within 24 hours
3. Users receive offer notifications and can accept by sharing contact info

## Architecture

### Tech Stack

- **Runtime**: Bun
- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Neon Postgres (MVP) -> Yandex Managed PostgreSQL (production)
- **Deployment**: Vercel
- **Messaging**: Max Messenger / Telegram Mini Apps

### Data Model

```
Buyer (from Max/TG)
- id (Max/TG user ID)
- created_at
- platform (max | telegram)

Inquiry
- id
- buyer_id -> Buyer
- phone (required)
- name (required)
- email
- status_type (enum - see form spec)
- status_description (if "other")
- model (Granta, Vesta, etc.)
- submodel (sedan, Cross, etc.)
- transmission (manual | automatic | any)
- color
- consent_checkbox (required true)
- created_at
- expires_at (created_at + 24h)
- accepted_offer_id -> Offer (nullable)

Dealer
- id
- name
- email
- password_hash
- created_at

Offer
- id
- inquiry_id -> Inquiry
- dealer_id -> Dealer
- price
- comment
- created_at
- updated_at
- status (pending | accepted | expired)
```

### User Flow

1. **Landing Page** -> Button opens Max/TG bot
2. **Mini App Form** -> Collects car preferences + contact info
3. **Inquiry Created** -> 24-hour countdown starts
4. **Dealer Dashboard** -> View active inquiries, submit/edit offers
5. **User Notifications** -> Bot sends offer updates
6. **Accept Offer** -> User shares contact info with dealer (lead generated)

### Routes

```
/ - Landing page with Max/TG bot button
/app - Mini app entry (Max/TG WebView)
/app/form - Car inquiry form
/app/offers - User's received offers (future)

/dealer - Dealer login
/dealer/inquiries - Active inquiries list
/dealer/inquiries/[id] - View inquiry + submit offer
```

### API Routes

```
POST /api/inquiries - Create new inquiry (from mini app)
GET /api/inquiries - List active inquiries (dealer auth)
GET /api/inquiries/[id] - Get inquiry details (dealer auth)

POST /api/offers - Create offer (dealer auth)
PATCH /api/offers/[id] - Update offer (dealer auth)

POST /api/offers/[id]/accept - Accept offer (user auth via Max/TG)

POST /api/webhooks/max - Max bot webhook
POST /api/webhooks/telegram - Telegram bot webhook (future)
```

### Max Messenger Integration

- **Bridge Library**: `https://st.max.ru/js/max-web-app.js`
- **User Data**: `window.WebApp.initDataUnsafe` provides user ID, name, etc.
- **Deep Link**: `https://max.ru/<botName>?startapp=<payload>`
- **Methods**: `requestContact()`, `close()`, `ready()`

### MVP Scope

Phase 1 (Current):

- [x] Project setup with Next.js + shadcn
- [ ] Landing page with Max bot button
- [ ] Mini app form (car preferences)
- [ ] Database schema + Prisma setup
- [ ] Inquiry creation API
- [ ] Basic dealer dashboard (hardcoded auth)
- [ ] Offer creation/editing

Phase 2:

- [ ] Max webhook for notifications
- [ ] Offer acceptance flow
- [ ] Lead generation confirmation

Phase 3:

- [ ] Telegram support (same UI, different webhook)
- [ ] Proper dealer authentication
- [ ] Analytics dashboard

## Form Specification

### Required Fields

- Phone (telefon)
- Name (imya)
- Status (dropdown): See status options below
- Model (Lada model)
- Submodel (depends on model selection)
- Transmission (radio: manual/automatic/any)
- Consent checkbox

### Optional Fields

- Email
- Color (dropdown with "other" option)

### Status Options

- Podderzhivayu rossiyskikh boytsov v zone SVO
- Uchastnik SVO / mobilizovannyy
- Semya uchastnika SVO
- Veteran boyevykh deystviy
- Drugoye (with description field)

### Model -> Submodel Mapping

See AGENTS.md for complete mapping
