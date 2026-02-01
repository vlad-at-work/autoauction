# Implementation Ready: Multi-Offer Reverse Auction Feature

## Status: Ready for Planning Phase

### ✅ Completed
1. **MAX Button Restored** 
   - Re-added to landing page with icons from `public/icons/`
   - Build verified: `bun run build` succeeds
   - Both MAX and Telegram buttons with proper styling and icons
   - Changes: `src/app/page.tsx` (48 lines added)

2. **MAX Webhook Research Complete**
   - Created `docs/MAX_WEBHOOK_RESEARCH.md` with findings from dev.max.ru/docs-api
   - Documented: No webhook config in MAX cabinet (must use API)
   - Probable root cause of "Unknown recipient" error identified
   - Next steps outlined for fixing MAX messaging

3. **Clarifying Questions Document Created**
   - `IMPLEMENTATION_QUESTIONS.md` with 12 detailed question categories
   - 50+ specific clarifying questions awaiting user responses
   - Covers all major design decisions, UX flows, and technical details

4. **Documentation Updated**
   - `AGENTS.md` updated with MAX webhook research reference
   - Current blocker clearly documented for future developers

---

## 📋 Awaiting Your Answers To: IMPLEMENTATION_QUESTIONS.md

Before we proceed to detailed implementation planning, please answer the clarifying questions in `IMPLEMENTATION_QUESTIONS.md`. Key question categories:

1. **Offer Visibility & Grouping** - How should multiple offers be displayed to users?
2. **Transaction Acceptance Logic** - Can users change acceptances? What about the 3-cap per dealer?
3. **Dealer UX & Incentives** - What do dealers see about competing offers?
4. **Inquiry Expiry** - Handle expired inquiries with multiple acceptances?
5. **Pricing & Billing** - When is the 10k RUB charge applied?
6. **Dealer Offer Limit** - Cap offers per dealer per inquiry?
7. **Inquiry UID Display** - Show first 6 chars to dealers?
8. **Database Migration** - Keep Lead model or replace entirely with Transaction?
9. **UI Text** - Russian text preferences for multi-offer scenarios?
10. **Notification Flow** - Notify on every new offer? Notify rejected dealers?
11. **Transaction Closure** - Add closedAt field?
12. **Technical Enforcement** - Where to enforce 3-acceptance cap?

---

## 🎯 Current Design Assumptions (To Confirm)

```
✓ One accepted offer per dealer per inquiry (via Transaction unique constraint)
✓ Maximum 3 total accepted offers per inquiry (cap)
✓ Dealers can make unlimited offers, but locked out after acceptance
✓ Dealers see inquiry UID (first 6 chars) pre-acceptance, full info post-acceptance
✓ Users see all offers (grouping strategy TBD)
✓ Offers are immutable (can't edit, only create new)
✓ All UI text in Russian
✓ DB can be wiped for testing
```

**Are these correct? Need any changes?**

---

## 🔧 MAX Integration Status

### What's Been Done
- ✅ MAX button restored to landing page
- ✅ Icon integration completed
- ✅ Latest MAX API research completed

### What's Pending
- ⏳ Webhook setup for MAX messaging (separate from multi-offer feature)
- ⏳ Fix "Unknown recipient" error (probable fix: webhook registration)
- ⏳ Test MAX notifications end-to-end

**Note**: MAX fixing is orthogonal to the multi-offer feature; can be parallelized after you answer the clarifying questions.

---

## 📊 Schema Changes Overview (Preview)

### Current Offer Model
```prisma
model Offer {
  id        String  @id @default(cuid())
  inquiry   Inquiry @relation(...)
  inquiryId String
  dealer    Dealer  @relation(...)
  dealerId  String
  price     Int
  comment   String?
  createdAt DateTime @default(now())
  leads     Lead[]
  @@unique([inquiryId, dealerId])  // ← WILL BE REMOVED
  @@index([inquiryId])
  @@index([dealerId])
}
```

### Proposed Transaction Model (New)
```prisma
model Transaction {
  id        String   @id @default(cuid())
  inquiry   Inquiry  @relation(...)
  inquiryId String
  offer     Offer    @relation(..., @unique)
  offerId   String   @unique
  dealer    Dealer   @relation(...)
  dealerId  String
  
  // Buyer info revealed at acceptance
  buyerName  String
  buyerEmail String?
  buyerPhone String
  
  acceptedAt DateTime @default(now())
  closedAt   DateTime?  // TBD: add this?
  status     String   @default("open")  // TBD: keep this?
  
  @@unique([inquiryId, dealerId])  // One transaction per dealer per inquiry
  @@index([inquiryId])
  @@index([dealerId])
}
```

### Migration Strategy
- **Remove**: `@@unique([inquiryId, dealerId])` from Offer
- **Drop**: `Lead` table (or keep as legacy if needed)
- **Add**: `Transaction` table
- **Migrate**: Existing leads → transactions (if any)

---

## 📝 Files Changed Summary

### Modified Files (2)
1. `src/app/page.tsx` - 48 lines added (MAX button + icons)
2. `AGENTS.md` - 2 lines added (MAX webhook references)

### New Files (2)
1. `docs/MAX_WEBHOOK_RESEARCH.md` - 105 lines (MAX API findings)
2. `IMPLEMENTATION_QUESTIONS.md` - 350+ lines (clarifying questions)

### Total Impact
- **Files modified**: 2
- **Files created**: 2
- **Lines of code changed**: 50
- **Build status**: ✅ Passing

---

## 🚀 Next Steps

### Phase 1: User Clarification (In Progress)
- [ ] User answers IMPLEMENTATION_QUESTIONS.md
- [ ] Confirm all assumptions
- [ ] Clarify any ambiguous design points

### Phase 2: Detailed Planning (After clarification)
- [ ] Create detailed step-by-step implementation plan
- [ ] Identify critical files requiring changes
- [ ] Plan database migration
- [ ] Plan API route changes
- [ ] Plan UI/UX components

### Phase 3: Implementation (After planning)
- [ ] Update Prisma schema
- [ ] Run migration
- [ ] Update API routes
- [ ] Update dealer portal UI
- [ ] Update user dashboard UI
- [ ] Test flows end-to-end

### Phase 4: MAX Webhook Fix (Parallel)
- [ ] Set up webhook endpoint
- [ ] Register with MAX API
- [ ] Test message sending
- [ ] Document solution for future reference

---

## 💡 Quick Command Reference

### Development
```bash
# Start dev server (with node 22)
export NVM_DIR="$HOME/.nvm" && \. "$NVM_DIR/nvm.sh" && nvm use 22
bun dev

# Build verification
bun run build

# Run tests (may fail, see AGENTS.md)
bun run test
```

### Testing
```bash
# Clear database (remote Neon)
CONFIRM_DELETE_ALL=yes bun --env-file=.env.local run db:cleanup -- --all

# Send test MAX notification
bun --env-file=.env.local run scripts/test-max-notification.ts <chat_id> "hello"
```

---

## 📚 Reference Documents

- `IMPLEMENTATION_QUESTIONS.md` - **MUST READ** before implementation
- `docs/MAX_WEBHOOK_RESEARCH.md` - MAX API findings and webhook fix strategy
- `docs/max_integration.txt` - Earlier MAX research (reference)
- `docs/max_notification_issue.md` - MAX messaging issue details
- `DEMO_GUIDE.md` - Current demo flow (will change with multi-offer)

---

## ⚠️ Important Notes

1. **Russian UI Text Required**: All new UI text must be in Russian
2. **Database is Remote**: PostgreSQL on Neon; wipes affect live remote DB
3. **Node Version**: Must use Node 22 (via nvm) for builds
4. **MAX Messaging**: Currently broken; documented in MAX_WEBHOOK_RESEARCH.md
5. **Tests**: Don't modify tests to make them pass; fix implementation instead

---

## ✋ Ready for Your Input

**Please review and answer the questions in `IMPLEMENTATION_QUESTIONS.md`.**

Once your answers are received, I'll create a detailed implementation plan with:
- Step-by-step code changes
- Exact database migrations
- API route specifications
- UI component specifications
- Test scenarios

