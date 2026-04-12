/**
 * Shared cleanup utility for integration tests
 * Removes test data with specified prefix only
 */

import { prisma } from '@/lib/db';

export async function cleanupTestData(testPrefix: string) {
  // Delete in reverse order of dependencies
  await prisma.transaction.deleteMany({
    where: { dealer: { username: { startsWith: testPrefix } } },
  });

  await prisma.offer.deleteMany({
    where: { dealer: { username: { startsWith: testPrefix } } },
  });

  await prisma.inquiry.deleteMany({
    where: { buyer: { platformUserId: { startsWith: testPrefix } } },
  });

  await prisma.buyer.deleteMany({
    where: { platformUserId: { startsWith: testPrefix } },
  });

  await prisma.dealer.deleteMany({
    where: { username: { startsWith: testPrefix } },
  });
}
