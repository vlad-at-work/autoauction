Plan: Un-stub Notifications with Deep Linking

## Context

The dealer invite flow is now working (fixed across commits 9da420b–ac2685d). All notification functions in `src/lib/notifications/index.ts` are stubs (log-only no-ops). The call sites are already wired up — they call stubs that return `{ success: true }` without sending anything.

**Goal:** Make notifications send real messages via MAX bot, with `open_app` deep-link buttons where appropriate.

### Why the invite flow was impossible before

The root cause was `?startapp=` vs `?start=`. With `?startapp=`, MAX opens the mini-app directly — no chat, no webhook, no `bot_started` event. The token never reached the webhook handler. Once we switched to `?start=`, MAX opens a **chat** first, fires `bot_started` with the token in `update.payload`, the webhook sends a welcome message with an `open_app` button, and the button's `payload` becomes `?startapp=TOKEN` when the mini-app opens — which `dealerinterface/page.tsx` already reads via `searchParams.get('startapp')`. Every piece was in place; one wrong URL scheme broke the entire chain.

### Deep linking from MAX docs

**Supported.** `open_app` button `payload` → arrives as `?startapp=PAYLOAD` and `initDataUnsafe.start_param`.

- **Allowed chars:** A-Z, a-z, 0-9, `_`, `-` only (NO colons, slashes)
- **Max length:** 512 characters

### Existing deep link infrastructure (buyer side)

`src/lib/deeplinks.ts` has `parseStartParam()` using **colon** separators: `inquiry:ID`, `offer:inquiryId:offerId`. The buyer entry (`src/app/app/page.tsx`) already calls this and routes to the correct page.

**Problem:** Colons are not allowed in MAX `payload`. Fix: change `parseStartParam` to accept both `_` and `:` as separators (backward compat for any existing links, forward compat for MAX payloads).

---

## Part 1: Fix Deep Link Separator

**File:** `src/lib/deeplinks.ts`

Change `parseStartParam` to split on `_` instead of `:` (or accept both):

```typescript
// Before: const parts = param.split(':');
// After:  split on first _ or : to get context, rest is resourceId
const sepIndex = Math.max(param.indexOf('_'), param.indexOf(':'));
```

Actually simpler: since IDs are UUIDs (contain hyphens but not underscores), split on first `_`:

- `inquiry_CUID` → context=`inquiry`, resourceId=`CUID`
- `offer_INQUIRYID_OFFERID` → context=`offer`, resourceId=`INQUIRYID_OFFERID` (then split resourceId on `_` for the two IDs)
- `accepted_INQUIRYID` → context=`accepted`, resourceId=`INQUIRYID`

Update `parseStartParam` to handle `_` separator. Update offer format from `inquiryId:offerId` to `inquiryId_offerId`. Add `accepted` as a valid context that maps to inquiry detail.

Also update the buyer entry point routing in `src/app/app/page.tsx` to split offer resourceId on `_` instead of `:`.

---

## Part 2: Un-stub Notifications

**File:** `src/lib/notifications/index.ts`

Import `sendMaxMessage` and `MaxButton` from `./max`. Replace each stub:

### 2.1 `notifyBuyer(buyer, text)` — text only, no buttons

```
MAX → sendMaxMessage(buyer.platformUserId, text, undefined, 'customer')
TELEGRAM → log + return success (deferred)
```

### 2.2 `notifyBuyerOfNewOffer(buyer, inquiryId, offerId, model, submodel, price, isFirstOffer)`

- Text: car + price details
- Button: `open_app`, payload `offer_${inquiryId}_${offerId}`, `web_app` = `MAX_BOT_NAME` / `NEXT_PUBLIC_MAX_BOT_NAME`

### 2.3 `notifyDealerOfNewInquiryViaBot(dealer, inquiryId, model, submodel, transmission, color)`

- Text: new inquiry details
- Button: `open_app`, payload `inquiry_${inquiryId}`, `web_app` = `MAX_BOT_NAME_DEALER` / `NEXT_PUBLIC_MAX_BOT_NAME_DEALER`

### 2.4 `notifyDealerOfAcceptedOfferViaBot(dealer, inquiryId, model, submodel, price, buyerName, buyerPhone)`

- Text: acceptance + buyer contact info (name, phone in the message body)
- Button: `open_app`, payload `accepted_${inquiryId}`, `web_app` = `MAX_BOT_NAME_DEALER` / `NEXT_PUBLIC_MAX_BOT_NAME_DEALER`

### 2.5 `sendDealerPasswordResetCode(dealer, code)` — text only, no buttons

### 2.6 Delete stub `sendMaxMessage` / `sendTelegramMessage` re-exports at bottom of file

---

## Part 3: Add Deep Link Routing in Dealer Entry

**File:** `src/app/dealerinterface/page.tsx` (~line 46, before the `setup_` check)

Add handling for notification deep links before the invite token check:

```
if (finalStartParam?.startsWith('inquiry_')) → router.push(`/dealerinterface/inquiries/${id}`)
if (finalStartParam?.startsWith('accepted_')) → router.push(`/dealerinterface/inquiries/${id}`)
```

Extract the ID by stripping the prefix (`inquiry_` or `accepted_`).

---

## Part 4: Enable Notification in Dealer Offers API

**File:** `src/app/api/dealer/offers/route.ts` (line ~116)

Un-comment and fix the `notifyBuyerOfNewOffer` call. The current commented line passes objects but the function takes individual args. Fix to match the signature:

```typescript
await notifyBuyerOfNewOffer(
  {
    platform: inquiry.buyer.platform,
    platformChatId: inquiry.buyer.platformChatId,
    platformUserId: inquiry.buyer.platformUserId,
  },
  inquiryId,
  offer.id,
  inquiry.model,
  inquiry.submodel,
  Math.round(price),
  existingOfferCount === 0
);
```

Need to add `model`/`submodel` to the inquiry select in this route's Prisma query (currently only selects buyer info).

---

## Files Changed

| File                                 | Change                                                   |
| ------------------------------------ | -------------------------------------------------------- |
| `src/lib/deeplinks.ts`               | Change separator from `:` to `_`, add `accepted` context |
| `src/lib/notifications/index.ts`     | Replace all stubs with real `sendMaxMessage` calls       |
| `src/app/dealerinterface/page.tsx`   | Add `inquiry_` and `accepted_` deep link routing         |
| `src/app/app/page.tsx`               | Update offer resourceId split from `:` to `_`            |
| `src/app/api/dealer/offers/route.ts` | Un-comment + fix notification call, expand Prisma select |

## Files NOT Changed

| File                                | Why                                                                   |
| ----------------------------------- | --------------------------------------------------------------------- |
| `src/lib/notifications/max.ts`      | Already working correctly — `sendMaxMessage` + `MaxButton` type       |
| `src/app/api/inquiries/route.ts`    | Call sites already correct                                            |
| `src/app/api/transactions/route.ts` | Call sites already correct                                            |
| `src/app/api/offers/route.ts`       | Old Basic Auth route — works but dealers now use `/api/dealer/offers` |

---

## Verification

1. **New inquiry:** Buyer creates inquiry → all active dealers get MAX message with car details + "Открыть заявку" button → tap opens dealer mini-app at that inquiry's page
2. **New offer:** Dealer submits offer → buyer gets MAX message with price + "Посмотреть предложение" button → tap opens buyer mini-app at the offer
3. **Accepted offer:** Buyer accepts offer → dealer gets MAX message with buyer name/phone + "Открыть сделку" button → tap opens dealer mini-app at the inquiry showing accepted transaction
4. **Buyer confirmations:** Buyer gets text confirmations for inquiry creation and offer acceptance (no buttons, already handled by `notifyBuyer`)
