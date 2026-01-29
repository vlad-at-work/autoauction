/* eslint-disable no-console */
/**
 * Cleanup script for removing seed/test data from the database.
 * Run with: bun run db:cleanup
 *
 * Use --all flag to delete ALL data (dangerous!): bun run db:cleanup -- --all
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_PREFIX = 'seed_';
const TEST_PREFIX = 'test_';

async function main() {
  const deleteAll = process.argv.includes('--all');

  if (deleteAll) {
    console.log('⚠️  WARNING: Deleting ALL data from database!\n');
    await deleteAllData();
  } else {
    console.log('🧹 Cleaning up seed and test data...\n');
    await cleanupPrefixedData();
  }

  console.log('\n✅ Cleanup completed!');
}

async function cleanupPrefixedData() {
  // Delete seed data
  console.log(`Deleting data with prefix "${SEED_PREFIX}"...`);
  await deleteByPrefix(SEED_PREFIX);

  // Delete test data
  console.log(`Deleting data with prefix "${TEST_PREFIX}"...`);
  await deleteByPrefix(TEST_PREFIX);
}

async function deleteByPrefix(prefix: string) {
  // Delete leads linked to seed/test offers
  const deletedLeads = await prisma.lead.deleteMany({
    where: {
      offer: {
        inquiry: {
          buyer: {
            platformUserId: { startsWith: prefix },
          },
        },
      },
    },
  });
  console.log(`  - Deleted ${deletedLeads.count} leads`);

  // Delete offers linked to seed/test inquiries or dealers
  const deletedOffers = await prisma.offer.deleteMany({
    where: {
      OR: [
        {
          inquiry: {
            buyer: {
              platformUserId: { startsWith: prefix },
            },
          },
        },
        {
          dealer: {
            username: { startsWith: prefix },
          },
        },
      ],
    },
  });
  console.log(`  - Deleted ${deletedOffers.count} offers`);

  // Delete inquiries linked to seed/test buyers
  const deletedInquiries = await prisma.inquiry.deleteMany({
    where: {
      buyer: {
        platformUserId: { startsWith: prefix },
      },
    },
  });
  console.log(`  - Deleted ${deletedInquiries.count} inquiries`);

  // Delete seed/test buyers
  const deletedBuyers = await prisma.buyer.deleteMany({
    where: {
      platformUserId: { startsWith: prefix },
    },
  });
  console.log(`  - Deleted ${deletedBuyers.count} buyers`);

  // Delete seed/test dealers
  const deletedDealers = await prisma.dealer.deleteMany({
    where: {
      username: { startsWith: prefix },
    },
  });
  console.log(`  - Deleted ${deletedDealers.count} dealers`);
}

async function deleteAllData() {
  // Confirmation required via environment variable for safety
  if (process.env.CONFIRM_DELETE_ALL !== 'yes') {
    console.log('❌ To delete all data, set CONFIRM_DELETE_ALL=yes environment variable');
    console.log('   Example: CONFIRM_DELETE_ALL=yes bun run db:cleanup -- --all');
    process.exit(1);
  }

  console.log('Deleting all leads...');
  const deletedLeads = await prisma.lead.deleteMany();
  console.log(`  - Deleted ${deletedLeads.count} leads`);

  console.log('Deleting all offers...');
  const deletedOffers = await prisma.offer.deleteMany();
  console.log(`  - Deleted ${deletedOffers.count} offers`);

  console.log('Deleting all inquiries...');
  const deletedInquiries = await prisma.inquiry.deleteMany();
  console.log(`  - Deleted ${deletedInquiries.count} inquiries`);

  console.log('Deleting all buyers...');
  const deletedBuyers = await prisma.buyer.deleteMany();
  console.log(`  - Deleted ${deletedBuyers.count} buyers`);

  console.log('Deleting all dealers...');
  const deletedDealers = await prisma.dealer.deleteMany();
  console.log(`  - Deleted ${deletedDealers.count} dealers`);
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
