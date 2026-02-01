# Manual Testing Guide - Reverse Auction Implementation

## Overview

This document provides comprehensive manual testing instructions for the reverse auction platform with multi-offer per dealer, transaction model, and inquiry limits.

## Quick Start

### Clear Database
```bash
bun run db:clear
```
This clears all data and verifies database connectivity. Should show:
```
Nuking DB...
DB cleared
Remaining: { buyers: 0, inquiries: 0, offers: 0, transactions: 0, dealers: 0 }
```

### Run Tests
```bash
# Unit tests (24 tests for inquiry utilities)
bun test src/__tests__/unit/inquiry-utils.test.ts

# All unit tests (37 tests total)
bun test src/__tests__/unit

# Integration tests (56 tests for full flows)
bun test src/__tests__/happy

# Total: 93 tests all passing
```

### Start Development Server
```bash
source ~/.nvm/nvm.sh && nvm use 20
bun run dev
```

Then open http://localhost:3000

## Manual Testing Scenarios

### Scenario 1: Create an Inquiry

**Goal:** Verify inquiry creation with limit tracking

1. Navigate to http://localhost:3000/app/form
2. Fill out the inquiry form:
   - Name: Test Buyer
   - Phone: +7 (999) 123-45-67
   - Email: test@example.com
   - Model: Land Cruiser 250
   - Submodel: First Edition
   - Transmission: Автомат
   - Color: Белый
   - Additional: Test inquiry
3. Submit the form
4. **Expected Results:**
   - Inquiry is created successfully
   - Dashboard shows the new inquiry
   - Display shows: "Осталось заявок: 1 из 2" (1 inquiry remaining out of 2)
   - Inquiry has color-coded ID tag based on first 6 characters
   - Inquiry expires in 24 hours

**What's being tested:**
- Inquiry creation with buyer info
- Monthly limit enforcement (2 per month, 15-day reset)
- Color-coded inquiry ID display

---

### Scenario 2: Multiple Offers from Single Dealer

**Goal:** Verify dealers can submit up to 5 offers per inquiry

**Prerequisites:** One active inquiry from Scenario 1

1. Navigate to http://localhost:3000/dealer
2. Enter dealer credentials (create test dealer in DB if needed)
3. Select the inquiry from Scenario 1
4. Submit 5 offers with different prices:
   - Offer 1: 5,000,000 ₽
   - Offer 2: 4,900,000 ₽
   - Offer 3: 4,800,000 ₽
   - Offer 4: 4,700,000 ₽
   - Offer 5: 4,600,000 ₽
5. Try to submit a 6th offer
6. **Expected Results:**
   - All 5 offers are created successfully
   - Each offer shows price formatted in Russian locale with spaces and ₽ symbol
   - 6th offer submission fails or shows error (max 5 per dealer)
   - Dealer can view all their own offers
   - Each offer shows creation timestamp

**What's being tested:**
- Multi-offer per dealer (previously limited to 1)
- Offer cap enforcement (max 5 per dealer per inquiry)
- Price formatting and display
- Offer list ordering

---

### Scenario 3: View Competing Offers (Dealer View)

**Goal:** Verify dealers see anonymized competing offers

**Prerequisites:** Multiple dealers submitting offers to same inquiry

1. As Dealer A, submit 3 offers to the inquiry
2. As Dealer B, submit 1 offer to the same inquiry
3. As Dealer C, submit 2 offers to the same inquiry
4. Log back in as Dealer A and view the inquiry
5. **Expected Results:**
   - Dealer A sees their own 3 offers listed with prices and comments
   - Dealer A sees competing offers from:
     - "Дилер B" (1 offer)
     - "Дилер C" (2 offers)
   - Dealer does NOT see actual names, only anonymized names
   - Does NOT see competing offer prices (only in future phases)
   - Inquiry ID shown with color tag from first 6 characters
   - Different dealers always get same anonymized names (Дилер A, B, C always map same)

**What's being tested:**
- Anonymized dealer names for competitive visibility
- Dealer offer grouping and counting
- Privacy protection (no dealer names leaked)
- Consistent anonymization mapping

---

### Scenario 4: Accept Offers (User View)

**Goal:** Verify user can accept up to 3 offers with proper limits

**Prerequisites:** 4+ dealers with offers on the same inquiry

1. Navigate to dashboard and click the inquiry from Scenario 1
2. View all offers grouped by dealer:
   - Dealer A (3 offers)
   - Dealer B (1 offer)
   - Dealer C (2 offers)
3. Click on best offer from Dealer A (cheapest)
4. Click "Принять предложение" (Accept offer)
5. **Expected Results:**
   - Offer detail page shows:
     - Full offer info (price, dealer name, comment)
     - Acceptance counter: "Вы приняли: 1 из 3"
     - Remaining acceptances: "Осталось: 2"
   - Transaction is created
   - Dialog/toast confirms acceptance
   - Return to dashboard - offer shows checkmark as accepted
   - Dealer A's other offers still visible but locked (can't accept from same dealer)

6. Accept 2nd offer from Dealer B (best price)
7. **Expected Results:**
   - Acceptance counter shows: "Вы приняли: 2 из 3"
   - Remaining: 1

8. Accept 3rd offer from Dealer C (best price)
9. **Expected Results:**
   - Acceptance counter shows: "Вы приняли: 3 из 3"
   - Remaining: 0
   - Accept button disabled/hidden for all remaining offers
   - Message: "Вы использовали все доступные принятия" (limit reached)

10. Try to accept 4th offer
11. **Expected Results:**
    - Cannot accept (button disabled or error message)
    - Message explains limit is reached

**What's being tested:**
- Offer acceptance creating transactions
- Acceptance limit enforcement (max 3 per inquiry)
- One offer per dealer per inquiry limit (can't accept 2 from same dealer)
- Proper UI updates and messaging
- Transaction creation in database

---

### Scenario 5: Inquiry Limit Reset

**Goal:** Verify the 2-per-month inquiry limit with 15-day reset

**Prerequisites:** Clean database

1. Create Inquiry #1 (Day 1)
2. Create Inquiry #2 (Day 1)
3. Try to create Inquiry #3 (same day)
4. **Expected Results:**
   - Inquiries #1 and #2 created successfully
   - Inquiry #3 fails with message: "Вы исчерпали лимит заявок (2 в месяц). Новая заявка будет доступна через X дн."
   - Dashboard shows: "Осталось заявок: 0 из 2"

5. Wait for 15 days (test in DB directly)
6. Create Inquiry #3
7. **Expected Results:**
   - Inquiry #3 created successfully
   - New reset date calculated (15 days from now)
   - Counter resets: "Осталось заявок: 1 из 2"

**What's being tested:**
- Monthly inquiry limit (2 per buyer)
- 15-day reset cycle
- Proper reset date calculation
- Error messaging for limit exceeded

---

### Scenario 6: Expired Inquiry Handling

**Goal:** Verify inquiries expire after 24 hours

**Prerequisites:** Active inquiry from Scenario 1

1. Create inquiry (note creation time)
2. Wait 24+ hours (or manually update expiresAt in DB to past)
3. Try to accept offer
4. **Expected Results:**
   - Offer detail page shows expiration status
   - Accept button disabled with message: "Заявка истекла"
   - Dashboard shows inquiry status as expired
   - Cannot create new offers for this inquiry

**What's being tested:**
- Inquiry expiration logic
- Proper status indication for expired inquiries
- Prevention of actions on expired inquiries

---

### Scenario 7: Admin Panel - Viewing Transactions

**Goal:** Verify admin can view transaction records

1. Navigate to http://localhost:3000/admin/transactions (if admin page exists)
2. View all transactions created from Scenario 4
3. **Expected Results:**
   - Each transaction shows:
     - Offer info (price, dealer)
     - Buyer info (name, phone, email)
     - Acceptance timestamp
     - Link to related inquiry

**What's being tested:**
- Transaction display in admin panel
- Proper data recording in transactions table
- Relationship mapping between transactions and offers

---

### Scenario 8: API Endpoints Testing (Using curl or Postman)

#### Create Inquiry
```bash
curl -X POST http://localhost:3000/api/inquiries \
  -H "Content-Type: application/json" \
  -d '{
    "platformUserId": "test_user_123",
    "platformUserName": "Test User",
    "platform": "max",
    "name": "John Doe",
    "phone": "+79991234567",
    "email": "john@example.com",
    "model": "Land Cruiser 250",
    "submodel": "First Edition",
    "transmission": "Автомат",
    "color": "Белый"
  }'
```

**Expected Response:**
```json
{
  "id": "clx123456...",
  "success": true,
  "remainingInquiries": 1,
  "nextInquiryAt": "2026-02-16T..."
}
```

#### Get Inquiry Details
```bash
curl "http://localhost:3000/api/inquiries/INQUIRY_ID?platformUserId=test_user_123"
```

**Expected Response:**
```json
{
  "id": "...",
  "model": "Land Cruiser 250",
  "offersByDealer": [
    {
      "dealerId": "...",
      "dealerName": "Dealer A",
      "hasTransaction": false,
      "offers": [...]
    }
  ],
  "acceptanceLimits": {
    "used": 0,
    "max": 3,
    "remaining": 3
  }
}
```

#### Submit Offer
```bash
curl -X POST http://localhost:3000/api/offers \
  -H "Content-Type: application/json" \
  -d '{
    "inquiryId": "INQUIRY_ID",
    "dealerId": "DEALER_ID",
    "platformUserId": "dealer_user_123",
    "price": 5000000,
    "comment": "Best price on market"
  }'
```

#### Accept Offer (Create Transaction)
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "offerId": "OFFER_ID",
    "platformUserId": "buyer_user_123",
    "platform": "max"
  }'
```

**What's being tested:**
- API response schemas
- Data validation
- Proper error handling
- Rate limiting (if implemented)

---

## Test Data Creation

### Manual SQL Queries (if needed)

Create test data directly in database:

```sql
-- Create buyer
INSERT INTO public."Buyer" (id, platform, "platformUserId", "platformUserName", "inquiriesUsedThisMonth", "inquiryLimitResetAt", "createdAt", "updatedAt")
VALUES ('buyer_1', 'MAX', 'test_buyer_123', 'Test Buyer', 0, NOW() + INTERVAL '15 days', NOW(), NOW());

-- Create dealers
INSERT INTO public."Dealer" (id, username, name, active, "createdAt", "updatedAt")
VALUES 
  ('dealer_1', 'dealer_alpha', 'Дилер Альфа', true, NOW(), NOW()),
  ('dealer_2', 'dealer_beta', 'Дилер Бета', true, NOW(), NOW()),
  ('dealer_3', 'dealer_gamma', 'Дилер Гамма', true, NOW(), NOW());

-- Create inquiry
INSERT INTO public."Inquiry" (id, "buyerId", name, phone, email, model, submodel, transmission, color, comment, "expiresAt", status, "statusDescription", "createdAt", "updatedAt")
VALUES ('inq_1', 'buyer_1', 'Test Buyer', '+79991234567', 'test@example.com', 'Land Cruiser 250', 'First Edition', 'Автомат', 'Белый', NULL, NOW() + INTERVAL '24 hours', 'active', NULL, NOW(), NOW());
```

---

## Verification Checklist

### Core Features
- [ ] Buyers can create inquiries (max 2 per month)
- [ ] Dealers can submit multiple offers (up to 5 per inquiry)
- [ ] Users can accept up to 3 offers per inquiry
- [ ] Only 1 offer per dealer can be accepted per inquiry
- [ ] Transactions are created when offers are accepted
- [ ] Dealer names are anonymized (Дилер A, B, C, etc.)
- [ ] Inquiry IDs have color tags based on first 6 chars
- [ ] Offers grouped by dealer in user dashboard
- [ ] Acceptance counter shows remaining acceptances
- [ ] Expired inquiries are properly handled

### UI/UX
- [ ] Price formatting displays correctly (Russian locale)
- [ ] Timestamps use relative time ("3 мин. назад")
- [ ] Color tags are visually distinct
- [ ] Accept buttons properly disabled when limits reached
- [ ] Error messages are clear and actionable
- [ ] Loading states are shown appropriately

### Database
- [ ] No stray Lead table references (all migrated to Transaction)
- [ ] Constraints are enforced (unique transaction per dealer per inquiry)
- [ ] Cascading deletes work properly
- [ ] Inquiry limits are tracked correctly

### API
- [ ] All endpoints return proper status codes
- [ ] Validation errors are descriptive
- [ ] Rate limiting works (if implemented)
- [ ] Pagination works for large offer lists

---

## Performance Considerations

### Load Testing Scenarios

1. **Single Inquiry with Many Offers**
   - Create 100 offers from 20 different dealers on 1 inquiry
   - Load offer list - should be responsive (<1s)

2. **Buyer with Many Inquiries**
   - Create 50 inquiries for same buyer
   - Load dashboard - should be responsive
   - Test offer acceptance speed

3. **Database Stress**
   - Create 1000 transactions
   - Run admin dashboard reports
   - Verify no N+1 query issues

---

## Expected Test Results

- **Total Tests:** 93
  - **Unit Tests:** 37
    - inquiry-utils: 24 tests (color generation, formatting, etc.)
    - Other utilities: 13 tests
  - **Integration Tests:** 56
    - Buyer flow: 18 tests
    - Admin flow: 20 tests
    - Reverse auction flow: 18 tests

- **All tests should pass** (0 failures)
- **Build should succeed** with no TypeScript errors

---

## Troubleshooting

### Issue: Database connection fails
**Solution:** Verify `.env.local` has correct `DATABASE_URL`

### Issue: Inquiries table not found
**Solution:** Run `bun run db:migrate` to apply pending migrations

### Issue: Dealer names not anonymized
**Solution:** Check that `anonymizeDealerName()` function is called in inquiry detail page

### Issue: Tests failing
**Solution:** 
1. Clear database: `bun run db:clear`
2. Run tests: `bun test src/__tests__/happy`
3. Check error messages for specific assertion failures

### Issue: Build errors about Lead model
**Solution:** All Lead references should be migrated. Search codebase: `grep -r "\.lead" src/`

---

## Cleanup After Testing

```bash
# Clear all test data
bun run db:clear

# Or run specific migrations
bun run db:migrate reset

# Or delete specific types of data
# (use admin panel or direct SQL)
```

---

## Notes

- All UI text is in Russian as required
- Timestamps use Russian date-fns locale
- Phone numbers are formatted with Russian formatting rules
- Prices use Russian number formatting (non-breaking space as thousands separator)
