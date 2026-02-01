# Implementation Questions: Multi-Offer Reverse Auction Feature

## Before we start building, I need clarification on several edge cases and design decisions:

---

## 1. OFFER VISIBILITY & GROUPING (User Dashboard)

**Q1.1:** When a user views their inquiry with multiple offers, how should they be displayed?

- **Option A**: Offers sorted by price (lowest first) with dealer names visible
- **Option B**: Offers grouped by dealer, showing all offers from each dealer together
- **Option C**: Chronological order (newest first)
- **Your preference**: ?

**Q1.2:** Should we show the dealer's previous offers to the user?
- Example: Dealer A made offer #1 at 1.5M, then offer #2 at 1.4M. Does the user see both in a list, or only the latest?

**Q1.3:** On the dealer side, when they view an inquiry with their multiple offers:
- Should they see ALL their previous offers on this inquiry?
- Should they be able to "retract" or "delete" an offer (or is it permanent once submitted)?

---

## 2. TRANSACTION ACCEPTANCE LOGIC

**Q2.1:** When a user accepts an offer, we said "dealer can no longer make offers on this inquiry."
- Does this mean:
  - Option A: Dealer is completely locked out (Transaction created = inquiry no longer appears for this dealer)
  - Option B: Dealer can still see the inquiry but the UI shows "you accepted this offer, no more offers allowed"
  - **Your preference**: ?

**Q2.2:** Should the user be able to CHANGE their acceptance decision?
- Example: User accepted Dealer A's offer, now regrets it. Can they:
  - Option A: Delete the acceptance and accept a different offer instead?
  - Option B: Once accepted, it's permanent (user must contact dealer to cancel)
  - **Your preference**: ?

**Q2.3:** The 3-acceptance cap — does this mean:
- **Option A**: User can accept up to 3 offers total, from any mix of dealers (so 3 from one dealer = cap filled)
- **Option B**: User can accept up to 3 offers, but max 1 per dealer (due to `@@unique([inquiryId, dealerId])`)
- **Current design**: We planned Option B with Transaction model
- **Is this correct?**: ?

---

## 3. DEALER UX & INCENTIVES

**Q3.1:** When a dealer sees an inquiry with existing offers, should they see:
- **Option A**: Just the inquiry details, no visibility into other dealers' offers
- **Option B**: Count of total offers ("3 offers already" or "offers: 1")
- **Option C**: Full list of competing offers (including prices, dealers, etc.)
- **Your preference**: ?

**Q3.2:** After a user accepts an offer from Dealer A:
- Should Dealer B, C, D still see the inquiry?
- **Option A**: Yes, they still see it (can make offers, but if accepted offer is from another dealer, they're locked out on acceptance)
- **Option B**: No, inquiry disappears from their list once ANY offer is accepted
- **Your preference**: ?

---

## 4. INQUIRY VISIBILITY & EXPIRY

**Q4.1:** Current behavior: inquiries expire after 24h. With multiple acceptances:
- Should expired inquiries still show accepted offers?
- **Option A**: Yes, user can see all their accepted deals even if inquiry expired
- **Option B**: No, expired inquiries are archived/hidden
- **Your preference**: ?

**Q4.2:** If a user creates an inquiry but DOESN'T accept any offers within 24h:
- **Current design**: Inquiry expires, dealers can't make new offers
- Should we let the user extend the inquiry (click "Re-open" to get another 24h)?
- **Your preference**: Yes/No?

---

## 5. PRICING & BILLING

**Q5.1:** "Charged at 10k RUB per acceptance" — when exactly is this charged?
- **Option A**: When user clicks "Accept" button
- **Option B**: When dealer confirms they received the lead (they click a link/button)
- **Option C**: Automatically after acceptance, but we don't implement billing yet (just plan for it)
- **Your preference**: ?

**Q5.2:** For MVP, should we:
- **Option A**: Implement billing logic now
- **Option B**: Just track "acceptance count" and "revenue" in the database, bill manually later
- **Your preference**: ?

---

## 6. DEALER OFFER LIMIT

**Q6.1:** Should we cap how many offers one dealer can make on a single inquiry?
- Example: Can Dealer A make 10 offers on the same inquiry?
- **Option A**: Unlimited offers (as long as they haven't been accepted)
- **Option B**: Cap at 3-5 offers per dealer
- **Your preference**: ?

---

## 7. INQUIRY UID DISPLAY (Dealer View)

**Q7.1:** You mentioned "dealers should see first 6 letters of the UID."
- Current inquiry IDs are CUID format (like `cly4x1z0e0000...`)
- Should dealers see: `cly4x1` in the inquiry list?
- Use case: So dealers can tell inquiries apart if they reference them in communication?
- **Correct understanding**: Yes?

**Q7.2:** Should this 6-char ID be visible:
- **Option A**: Only before any offer is accepted
- **Option B**: Always visible (even after transaction)
- **Your preference**: ?

---

## 8. DATABASE & MIGRATION

**Q8.1:** Current schema has `Lead` model with one-to-one with `Offer` (`@@unique([offerId])`).
- New plan: Create `Transaction` model to replace it
- Should we:
  - **Option A**: Drop the `Lead` table entirely and create `Transaction`
  - **Option B**: Keep `Lead` as deprecated, use only `Transaction` going forward
  - **Option C**: Keep both (complex, but allows fallback)
- **Your preference**: ?

**Q8.2:** For existing leads (if any), should we:
- **Option A**: Migrate them to `Transaction` (one-to-one mapping)
- **Option B**: Just wipe the DB (you mentioned we're in test mode and can do this)
- **Your preference**: ?

---

## 9. UI TEXT & MESSAGING (Russian)

**Q9.1:** When a user sees multiple offers from the same dealer (e.g., 1.5M and 1.4M):
- How should we label it?
- **Option A**: Show both with timestamps ("Предложение 1" / "Предложение 2")
- **Option B**: Show only the latest offer, with a note "дилер обновил предложение"
- **Option C**: Show all with date labels like "29 января 1.5M" / "30 января 1.4M"
- **Your preference**: ?

**Q9.2:** Error messages when user tries to accept a 4th offer:
- Suggested Russian text: "Вы уже приняли 3 предложения. Выберите одно из них или отклоните другое."
- **Does this feel right?**: Yes/modify?

---

## 10. NOTIFICATION FLOW

**Q10.1:** When a dealer makes their 2nd or 3rd offer on the same inquiry:
- Should the user be notified again?
- **Option A**: Yes, send notification for every new offer ("Дилер обновил предложение!")
- **Option B**: No, only notify on first offer from each dealer
- **Option C**: Only notify if price is better than their previous offer
- **Your preference**: ?

**Q10.2:** When a user accepts an offer, should we notify other dealers?
- **Option A**: Yes, with a message like "Ваше предложение отклонено, покупатель выбрал другого дилера"
- **Option B**: No, they just see the inquiry disappear from their list
- **Your preference**: ?

---

## 11. TRANSACTION/LEAD CLOSURE

**Q11.1:** After user accepts an offer and we create a `Transaction`:
- Should there be a separate `closedAt` field (not yet filled)?
- Use case: Dealer confirms they closed the deal with the customer
- **Option A**: Yes, add `closedAt` for tracking closed deals
- **Option B**: Just use `acceptedAt` for now
- **Your preference**: ?

---

## 12. TECHNICAL IMPLEMENTATION

**Q12.1:** For the "3 accepted offers" cap:
- Should this be enforced:
  - **Option A**: In the database constraint (can't insert 4th Transaction)
  - **Option B**: In the API logic (check count before creating Transaction)
  - **Option C**: Both
- **Your preference**: ?

**Q12.2:** Should we add an `acceptance_count` denormalized field on `Inquiry` for performance?
- Pro: Fast queries ("show inquiries with 3 acceptances")
- Con: Extra logic to keep in sync
- **Your preference**: Yes/No?

---

## Summary of Key Design Points to Confirm

1. **Max 1 accepted offer per dealer per inquiry** (via Transaction unique constraint)
2. **Max 3 total accepted offers per inquiry** (cap)
3. **Dealers can make unlimited offers, but can't make new ones after acceptance**
4. **Dealers see inquiry UID (first 6 chars) before acceptance, full contact info after**
5. **Users see all offers grouped somehow (need confirmation on grouping strategy)**
6. **Offers are immutable (can't edit, only create new)**
7. **All UI text in Russian**
8. **We can wipe DB to test**

**Are these assumptions correct? Any changes needed before I write the detailed implementation plan?**

