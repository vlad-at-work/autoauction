/**
 * Cleanup Test Data Only
 *
 * This script removes ONLY test data (prefixed with TEST_SUITE_ or TEST_)
 * Leaves all production/real data untouched
 *
 * Safe to run at any time
 */

import { prisma } from '@/lib/db';

const TEST_PREFIXES = ['TEST_SUITE_', 'TEST_', 'test_suite_', 'test_'];

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  let totalDeleted = 0;

  for (const prefix of TEST_PREFIXES) {
    console.log(`Checking for data with prefix: "${prefix}"`);

    // Delete password reset codes for test dealers
    const resetCodes = await prisma.passwordResetCode.deleteMany({
      where: {
        dealer: {
          OR: [{ username: { startsWith: prefix } }, { platformUserId: { startsWith: prefix } }],
        },
      },
    });
    if (resetCodes.count > 0) {
      console.log(`  ✓ Deleted ${resetCodes.count} password reset codes`);
      totalDeleted += resetCodes.count;
    }

    // Delete transactions for test dealers
    const transactions = await prisma.transaction.deleteMany({
      where: {
        dealer: {
          OR: [{ username: { startsWith: prefix } }, { platformUserId: { startsWith: prefix } }],
        },
      },
    });
    if (transactions.count > 0) {
      console.log(`  ✓ Deleted ${transactions.count} transactions`);
      totalDeleted += transactions.count;
    }

    // Delete offers from test dealers
    const offers = await prisma.offer.deleteMany({
      where: {
        dealer: {
          OR: [{ username: { startsWith: prefix } }, { platformUserId: { startsWith: prefix } }],
        },
      },
    });
    if (offers.count > 0) {
      console.log(`  ✓ Deleted ${offers.count} offers`);
      totalDeleted += offers.count;
    }

    // Delete inquiries from test buyers
    const inquiries = await prisma.inquiry.deleteMany({
      where: {
        buyer: {
          platformUserId: { startsWith: prefix },
        },
      },
    });
    if (inquiries.count > 0) {
      console.log(`  ✓ Deleted ${inquiries.count} inquiries`);
      totalDeleted += inquiries.count;
    }

    // Delete test buyers
    const buyers = await prisma.buyer.deleteMany({
      where: { platformUserId: { startsWith: prefix } },
    });
    if (buyers.count > 0) {
      console.log(`  ✓ Deleted ${buyers.count} buyers`);
      totalDeleted += buyers.count;
    }

    // Delete test dealers
    const dealers = await prisma.dealer.deleteMany({
      where: {
        OR: [{ username: { startsWith: prefix } }, { platformUserId: { startsWith: prefix } }],
      },
    });
    if (dealers.count > 0) {
      console.log(`  ✓ Deleted ${dealers.count} dealers`);
      totalDeleted += dealers.count;
    }
  }

  console.log(`\n✅ Cleanup complete: ${totalDeleted} test records deleted`);

  // Verify no test data remains
  const remainingTestDealers = await prisma.dealer.count({
    where: {
      OR: TEST_PREFIXES.map((prefix) => ({ username: { startsWith: prefix } })),
    },
  });

  const remainingTestBuyers = await prisma.buyer.count({
    where: {
      OR: TEST_PREFIXES.map((prefix) => ({ platformUserId: { startsWith: prefix } })),
    },
  });

  if (remainingTestDealers > 0 || remainingTestBuyers > 0) {
    console.warn(
      `⚠️  Warning: ${remainingTestDealers} test dealers and ${remainingTestBuyers} test buyers still exist`
    );
  } else {
    console.log('✅ Verification passed: No test data remains\n');
  }

  // Show current database stats (non-test data)
  const stats = {
    dealers: await prisma.dealer.count(),
    buyers: await prisma.buyer.count(),
    inquiries: await prisma.inquiry.count(),
    offers: await prisma.offer.count(),
    transactions: await prisma.transaction.count(),
  };

  console.log('Current database (production data):');
  console.log(`  Dealers:      ${stats.dealers}`);
  console.log(`  Buyers:       ${stats.buyers}`);
  console.log(`  Inquiries:    ${stats.inquiries}`);
  console.log(`  Offers:       ${stats.offers}`);
  console.log(`  Transactions: ${stats.transactions}`);
}

cleanupTestData()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('❌ Cleanup failed:', error);
    prisma.$disconnect();
    process.exit(1);
  });
