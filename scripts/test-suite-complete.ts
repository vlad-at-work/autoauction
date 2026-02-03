/**
 * Complete Automated Test Suite
 *
 * This script simulates the full user journey:
 * 1. Admin creates dealer
 * 2. Dealer sets password
 * 3. Customer creates inquiry
 * 4. Dealer submits 3 offers (simulating reverse auction)
 * 5. Customer accepts best offer
 * 6. Transaction is created
 * 7. All data is verified
 * 8. Cleanup only test data
 *
 * All test data uses TEST_ prefix for safe cleanup
 */

import { prisma } from '@/lib/db';
import { hashPassword, createSessionToken } from '@/lib/auth/dealer-auth';
import { Platform } from '@prisma/client';

const TEST_PREFIX = 'TEST_SUITE_';

// Test data
const TEST_DEALER = {
  username: `${TEST_PREFIX}dealer_1`,
  name: 'Test Motors Moscow',
  phone: '+7 (999) 111-1111',
  email: 'testdealer@example.com',
  description: 'Test dealer for automated suite',
  password: 'TestPass123!',
  platform: Platform.TELEGRAM,
  platformUserId: `${TEST_PREFIX}999999`,
  platformChatId: `${TEST_PREFIX}999999`,
};

const TEST_CUSTOMER = {
  name: 'Иван Тестов',
  phone: '+7 (912) 222-2222',
  email: 'testcustomer@example.com',
  platform: Platform.TELEGRAM,
  platformUserId: `${TEST_PREFIX}888888`,
  platformChatId: `${TEST_PREFIX}888888`,
};

const TEST_INQUIRY = {
  model: 'Vesta',
  submodel: 'sedan',
  transmission: 'Механика',
  color: 'Белый',
  status: 'Участник СВО',
  statusDescription: 'Участник СВО / мобилизованный',
  comment: 'Тестовая заявка для автоматизированного теста',
};

const TEST_OFFERS = [
  { price: 1500000, comment: 'Первое предложение - высокая цена' },
  { price: 1450000, comment: 'Второе предложение - снижение' },
  { price: 1400000, comment: 'Третье предложение - лучшая цена!' },
];

// Track created IDs for verification and cleanup
const createdIds = {
  dealer: null as string | null,
  buyer: null as string | null,
  inquiry: null as string | null,
  offers: [] as string[],
  transaction: null as string | null,
};

async function step1_CreateDealer() {
  console.log('\n📝 Step 1: Admin creates dealer...');

  const passwordHash = await hashPassword(TEST_DEALER.password);

  const dealer = await prisma.dealer.create({
    data: {
      username: TEST_DEALER.username,
      name: TEST_DEALER.name,
      phone: TEST_DEALER.phone,
      email: TEST_DEALER.email,
      description: TEST_DEALER.description,
      active: true,
      platform: TEST_DEALER.platform,
      platformUserId: TEST_DEALER.platformUserId,
      platformChatId: TEST_DEALER.platformChatId,
      passwordHash,
    },
  });

  createdIds.dealer = dealer.id;

  console.log('✅ Dealer created:', {
    id: dealer.id,
    username: dealer.username,
    name: dealer.name,
    hasPassword: !!dealer.passwordHash,
  });

  // Verify
  if (!dealer.passwordHash) {
    throw new Error('Dealer password hash not set!');
  }

  return dealer;
}

async function step2_VerifyDealerAuth(dealer: any) {
  console.log('\n🔐 Step 2: Verify dealer authentication...');

  // Create session token
  const token = createSessionToken({
    id: dealer.id,
    platform: dealer.platform,
    platformUserId: dealer.platformUserId,
  });

  console.log('✅ Session token created:', token.substring(0, 20) + '...');

  // Verify dealer can be found
  const foundDealer = await prisma.dealer.findUnique({
    where: { id: dealer.id },
  });

  if (!foundDealer) {
    throw new Error('Dealer not found after creation!');
  }

  console.log('✅ Dealer authentication ready');

  return token;
}

async function step3_CreateCustomer() {
  console.log('\n👤 Step 3: Customer account created (auto on first inquiry)...');

  const buyer = await prisma.buyer.create({
    data: {
      platform: TEST_CUSTOMER.platform,
      platformUserId: TEST_CUSTOMER.platformUserId,
      platformChatId: TEST_CUSTOMER.platformChatId,
      platformUserName: 'test_customer',
      inquiriesUsedThisMonth: 0,
      inquiryLimitResetAt: new Date(),
    },
  });

  createdIds.buyer = buyer.id;

  console.log('✅ Customer created:', {
    id: buyer.id,
    platform: buyer.platform,
    platformUserId: buyer.platformUserId,
    inquiriesUsed: buyer.inquiriesUsedThisMonth,
  });

  return buyer;
}

async function step4_CreateInquiry(buyer: any) {
  console.log('\n📋 Step 4: Customer creates inquiry...');

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const inquiry = await prisma.inquiry.create({
    data: {
      buyerId: buyer.id,
      name: TEST_CUSTOMER.name,
      phone: TEST_CUSTOMER.phone,
      email: TEST_CUSTOMER.email,
      status: TEST_INQUIRY.status,
      statusDescription: TEST_INQUIRY.statusDescription,
      model: TEST_INQUIRY.model,
      submodel: TEST_INQUIRY.submodel,
      transmission: TEST_INQUIRY.transmission,
      color: TEST_INQUIRY.color,
      comment: TEST_INQUIRY.comment,
      expiresAt,
    },
  });

  createdIds.inquiry = inquiry.id;

  // Update buyer inquiry count
  await prisma.buyer.update({
    where: { id: buyer.id },
    data: { inquiriesUsedThisMonth: 1 },
  });

  console.log('✅ Inquiry created:', {
    id: inquiry.id,
    model: `${inquiry.model} • ${inquiry.submodel}`,
    buyer: inquiry.name,
    expiresIn: '24 hours',
  });

  // Verify
  const hoursLeft = (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursLeft < 23 || hoursLeft > 25) {
    throw new Error('Inquiry expiration time is incorrect!');
  }

  return inquiry;
}

async function step5_DealerSubmitsOffers(dealer: any, inquiry: any) {
  console.log('\n💰 Step 5: Dealer submits 3 offers (reverse auction)...');

  for (let i = 0; i < TEST_OFFERS.length; i++) {
    const offerData = TEST_OFFERS[i];

    const offer = await prisma.offer.create({
      data: {
        inquiryId: inquiry.id,
        dealerId: dealer.id,
        price: offerData.price,
        comment: offerData.comment,
      },
    });

    createdIds.offers.push(offer.id);

    console.log(`  ✅ Offer #${i + 1}:`, {
      id: offer.id,
      price: offer.price.toLocaleString('ru-RU') + ' ₽',
      comment: offer.comment,
    });

    // Small delay to simulate real timing
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Verify offers
  const offerCount = await prisma.offer.count({
    where: { inquiryId: inquiry.id, dealerId: dealer.id },
  });

  if (offerCount !== TEST_OFFERS.length) {
    throw new Error(`Expected ${TEST_OFFERS.length} offers, found ${offerCount}`);
  }

  console.log(`✅ All ${TEST_OFFERS.length} offers submitted successfully`);

  return createdIds.offers;
}

async function step6_CustomerAcceptsOffer(inquiry: any, dealer: any) {
  console.log('\n✅ Step 6: Customer accepts best offer...');

  // Get the best offer (lowest price)
  const bestOffer = await prisma.offer.findFirst({
    where: { inquiryId: inquiry.id, dealerId: dealer.id },
    orderBy: { price: 'asc' },
  });

  if (!bestOffer) {
    throw new Error('No offers found to accept!');
  }

  console.log('  📌 Accepting offer:', {
    id: bestOffer.id,
    price: bestOffer.price.toLocaleString('ru-RU') + ' ₽',
    comment: bestOffer.comment,
  });

  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      inquiryId: inquiry.id,
      offerId: bestOffer.id,
      dealerId: dealer.id,
      buyerName: inquiry.name,
      buyerPhone: inquiry.phone,
      buyerEmail: inquiry.email,
      // Snapshot data
      offerPrice: bestOffer.price,
      inquiryModel: inquiry.model,
      inquirySubmodel: inquiry.submodel,
      inquiryTransmission: inquiry.transmission,
      inquiryColor: inquiry.color,
      dealerUsername: dealer.username,
      dealerName: dealer.name,
      dealerSubName: dealer.subName,
      dealerPhone: dealer.phone,
      dealerEmail: dealer.email,
      dealerDescription: dealer.description,
      acceptedAt: new Date(),
    },
  });

  createdIds.transaction = transaction.id;

  console.log('✅ Transaction created:', {
    id: transaction.id,
    buyerName: transaction.buyerName,
    buyerPhone: transaction.buyerPhone,
    buyerEmail: transaction.buyerEmail,
    dealerName: transaction.dealerName,
    price: transaction.offerPrice?.toLocaleString('ru-RU') + ' ₽',
  });

  return transaction;
}

async function step7_VerifyCompleteFlow() {
  console.log('\n🔍 Step 7: Verify complete flow...');

  // 1. Verify dealer
  const dealer = await prisma.dealer.findUnique({
    where: { id: createdIds.dealer! },
    include: {
      offers: true,
      transactions: true,
    },
  });

  if (!dealer) throw new Error('Dealer not found!');
  if (dealer.offers.length !== TEST_OFFERS.length) {
    throw new Error(`Expected ${TEST_OFFERS.length} offers, found ${dealer.offers.length}`);
  }
  if (dealer.transactions.length !== 1) {
    throw new Error(`Expected 1 transaction, found ${dealer.transactions.length}`);
  }

  console.log('  ✅ Dealer verification passed');

  // 2. Verify buyer
  const buyer = await prisma.buyer.findUnique({
    where: { id: createdIds.buyer! },
    include: {
      inquiries: true,
    },
  });

  if (!buyer) throw new Error('Buyer not found!');
  if (buyer.inquiries.length !== 1) {
    throw new Error(`Expected 1 inquiry, found ${buyer.inquiries.length}`);
  }
  if (buyer.inquiriesUsedThisMonth !== 1) {
    throw new Error('Buyer inquiry count not updated!');
  }

  console.log('  ✅ Buyer verification passed');

  // 3. Verify inquiry
  const inquiry = await prisma.inquiry.findUnique({
    where: { id: createdIds.inquiry! },
    include: {
      offers: true,
      transactions: true,
    },
  });

  if (!inquiry) throw new Error('Inquiry not found!');
  if (inquiry.offers.length !== TEST_OFFERS.length) {
    throw new Error(`Expected ${TEST_OFFERS.length} offers on inquiry`);
  }
  if (inquiry.transactions.length !== 1) {
    throw new Error('Expected 1 transaction on inquiry');
  }

  console.log('  ✅ Inquiry verification passed');

  // 4. Verify transaction
  const transaction = await prisma.transaction.findUnique({
    where: { id: createdIds.transaction! },
    include: {
      inquiry: true,
      offer: true,
      dealer: true,
    },
  });

  if (!transaction) throw new Error('Transaction not found!');
  if (transaction.buyerName !== TEST_CUSTOMER.name) {
    throw new Error('Transaction buyer name mismatch!');
  }
  if (transaction.buyerPhone !== TEST_CUSTOMER.phone) {
    throw new Error('Transaction buyer phone mismatch!');
  }
  if (transaction.offerPrice !== 1400000) {
    throw new Error('Transaction price mismatch!');
  }
  if (!transaction.inquiryModel || !transaction.dealerName) {
    throw new Error('Transaction snapshot data missing!');
  }

  console.log('  ✅ Transaction verification passed');

  // 5. Verify constraints
  const uniqueTransaction = await prisma.transaction.findUnique({
    where: {
      inquiryId_dealerId: {
        inquiryId: inquiry.id,
        dealerId: dealer.id,
      },
    },
  });

  if (!uniqueTransaction) {
    throw new Error('Unique constraint verification failed!');
  }

  console.log('  ✅ Database constraints verified');

  console.log('\n✅ All verification checks passed!');
}

async function step8_CleanupTestData() {
  console.log('\n🧹 Step 8: Cleanup test data...');

  let deletedCount = 0;

  // Delete in reverse order of dependencies
  console.log('  Deleting password reset codes...');
  const resetCodes = await prisma.passwordResetCode.deleteMany({
    where: { dealer: { username: { startsWith: TEST_PREFIX } } },
  });
  deletedCount += resetCodes.count;

  console.log('  Deleting transactions...');
  const transactions = await prisma.transaction.deleteMany({
    where: { dealer: { username: { startsWith: TEST_PREFIX } } },
  });
  deletedCount += transactions.count;

  console.log('  Deleting offers...');
  const offers = await prisma.offer.deleteMany({
    where: { dealer: { username: { startsWith: TEST_PREFIX } } },
  });
  deletedCount += offers.count;

  console.log('  Deleting inquiries...');
  const inquiries = await prisma.inquiry.deleteMany({
    where: { buyer: { platformUserId: { startsWith: TEST_PREFIX } } },
  });
  deletedCount += inquiries.count;

  console.log('  Deleting buyers...');
  const buyers = await prisma.buyer.deleteMany({
    where: { platformUserId: { startsWith: TEST_PREFIX } },
  });
  deletedCount += buyers.count;

  console.log('  Deleting dealers...');
  const dealers = await prisma.dealer.deleteMany({
    where: { username: { startsWith: TEST_PREFIX } },
  });
  deletedCount += dealers.count;

  console.log(`✅ Cleanup complete: ${deletedCount} records deleted`);

  // Verify cleanup
  const remainingDealers = await prisma.dealer.count({
    where: { username: { startsWith: TEST_PREFIX } },
  });
  const remainingBuyers = await prisma.buyer.count({
    where: { platformUserId: { startsWith: TEST_PREFIX } },
  });

  if (remainingDealers > 0 || remainingBuyers > 0) {
    throw new Error('Cleanup incomplete! Test data still exists.');
  }

  console.log('✅ Cleanup verification passed: No test data remains');
}

async function runCompleteSuite() {
  console.log('🚀 Starting Complete Automated Test Suite');
  console.log('==========================================\n');

  const startTime = Date.now();

  try {
    // Step 1: Admin creates dealer
    const dealer = await step1_CreateDealer();

    // Step 2: Verify dealer authentication
    const sessionToken = await step2_VerifyDealerAuth(dealer);

    // Step 3: Create customer
    const buyer = await step3_CreateCustomer();

    // Step 4: Customer creates inquiry
    const inquiry = await step4_CreateInquiry(buyer);

    // Step 5: Dealer submits 3 offers
    await step5_DealerSubmitsOffers(dealer, inquiry);

    // Step 6: Customer accepts best offer
    const transaction = await step6_CustomerAcceptsOffer(inquiry, dealer);

    // Step 7: Verify complete flow
    await step7_VerifyCompleteFlow();

    // Step 8: Cleanup test data
    await step8_CleanupTestData();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n🎉 COMPLETE TEST SUITE PASSED!');
    console.log('==========================================');
    console.log(`✅ All steps completed successfully in ${duration}s`);
    console.log('\nSummary:');
    console.log('  - Dealer created and authenticated ✓');
    console.log('  - Customer account created ✓');
    console.log('  - Inquiry created with 24h expiry ✓');
    console.log('  - 3 offers submitted (reverse auction) ✓');
    console.log('  - Best offer accepted (1,400,000 ₽) ✓');
    console.log('  - Transaction created with snapshots ✓');
    console.log('  - All data verified ✓');
    console.log('  - Test data cleaned up ✓');
  } catch (error) {
    console.error('\n❌ TEST SUITE FAILED!');
    console.error('==========================================');
    console.error(error);

    console.log('\n🧹 Attempting cleanup of partial test data...');
    try {
      await step8_CleanupTestData();
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the suite
runCompleteSuite();
