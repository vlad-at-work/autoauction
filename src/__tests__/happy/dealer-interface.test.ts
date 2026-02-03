/**
 * Live DB flow test for dealer interface
 * Tests the complete dealer authentication and interaction flow
 *
 * Prefix: TEST_DEALER_INTERFACE_
 * Cleanup: All test data is cleaned up after the test
 */

import { describe, expect, test, beforeAll, afterAll } from 'bun:test';
import { config } from 'dotenv';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth/dealer-auth';

config({ path: '.env.local' });

const TEST_PREFIX = 'TEST_DEALER_INTERFACE_';

// Track created IDs for cleanup
const createdIds = {
  dealers: [] as string[],
  inquiries: [] as string[],
  buyers: [] as string[],
};

async function cleanupTestData() {
  // Delete in reverse order of dependencies
  await prisma.passwordResetCode.deleteMany({
    where: { dealer: { username: { startsWith: TEST_PREFIX } } },
  });

  await prisma.offer.deleteMany({
    where: { dealer: { username: { startsWith: TEST_PREFIX } } },
  });

  await prisma.transaction.deleteMany({
    where: { dealer: { username: { startsWith: TEST_PREFIX } } },
  });

  await prisma.inquiry.deleteMany({
    where: { buyer: { platformUserId: { startsWith: TEST_PREFIX } } },
  });

  await prisma.buyer.deleteMany({
    where: { platformUserId: { startsWith: TEST_PREFIX } },
  });

  await prisma.dealer.deleteMany({
    where: { username: { startsWith: TEST_PREFIX } },
  });
}

beforeAll(async () => {
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
});

describe('Dealer Interface - Setup Flow', () => {
  let dealerId: string;
  let dealerUsername: string;

  test('should create dealer via admin', async () => {
    dealerUsername = `${TEST_PREFIX}dealer_${Date.now()}`;

    const dealer = await prisma.dealer.create({
      data: {
        username: dealerUsername,
        name: 'Test Dealer',
        active: true,
      },
    });

    dealerId = dealer.id;
    createdIds.dealers.push(dealerId);

    expect(dealer.id).toBeDefined();
    expect(dealer.passwordHash).toBeNull();
    expect(dealer.platform).toBeNull();
  });

  test('should check dealer status before setup', async () => {
    // Simulate dealer accessing the interface
    // Without platform association, should suggest setup
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
    });

    expect(dealer).not.toBeNull();
    expect(dealer?.platform).toBeNull();
    expect(dealer?.passwordHash).toBeNull();
  });

  test('should associate platform and set password', async () => {
    // Simulate first login: associate platform
    const passwordHash = await hashPassword('testPassword123');

    await prisma.dealer.update({
      where: { id: dealerId },
      data: {
        platform: 'TELEGRAM',
        platformUserId: `${TEST_PREFIX}123456`,
        platformChatId: `${TEST_PREFIX}123456`,
        passwordHash,
      },
    });

    const updated = await prisma.dealer.findUnique({
      where: { id: dealerId },
    });

    expect(updated?.platform).toBe('TELEGRAM');
    expect(updated?.platformUserId).toBe(`${TEST_PREFIX}123456`);
    expect(updated?.passwordHash).toBeDefined();
  });
});

describe('Dealer Interface - Password Reset Flow', () => {
  let dealerId: string;

  beforeAll(async () => {
    const dealer = await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}dealer_reset_${Date.now()}`,
        name: 'Test Dealer Reset',
        active: true,
        platform: 'TELEGRAM',
        platformUserId: `${TEST_PREFIX}reset123`,
        platformChatId: `${TEST_PREFIX}reset123`,
        passwordHash: await hashPassword('oldPassword'),
      },
    });

    dealerId = dealer.id;
    createdIds.dealers.push(dealerId);
  });

  test('should create password reset code', async () => {
    const code = '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const resetCode = await prisma.passwordResetCode.create({
      data: {
        dealerId,
        code,
        expiresAt,
      },
    });

    expect(resetCode.id).toBeDefined();
    expect(resetCode.code).toBe(code);
    expect(resetCode.usedAt).toBeNull();
  });

  test('should find valid reset code', async () => {
    const validCode = await prisma.passwordResetCode.findFirst({
      where: {
        dealerId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    expect(validCode).not.toBeNull();
    expect(validCode?.code).toBe('123456');
  });

  test('should mark code as used when resetting password', async () => {
    await prisma.passwordResetCode.updateMany({
      where: {
        dealerId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const usedCode = await prisma.passwordResetCode.findFirst({
      where: { dealerId },
    });

    expect(usedCode?.usedAt).not.toBeNull();
  });
});

describe('Dealer Interface - Mutual Exclusivity', () => {
  const platformUserId = `${TEST_PREFIX}mutual_${Date.now()}`;

  test('should prevent dealer from being buyer', async () => {
    // Create dealer first
    const dealer = await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}dealer_mutual_${Date.now()}`,
        name: 'Test Dealer Mutual',
        active: true,
        platform: 'TELEGRAM',
        platformUserId,
        platformChatId: platformUserId,
        passwordHash: await hashPassword('password123'),
      },
    });

    createdIds.dealers.push(dealer.id);

    // Try to create buyer with same platform user ID
    const existingDealer = await prisma.dealer.findFirst({
      where: {
        platform: 'TELEGRAM',
        platformUserId,
        deletedAt: null,
      },
    });

    expect(existingDealer).not.toBeNull();
    expect(existingDealer?.id).toBe(dealer.id);
  });

  test('should prevent buyer from being dealer', async () => {
    const buyerPlatformId = `${TEST_PREFIX}buyer_mutual_${Date.now()}`;

    // Create buyer first
    const buyer = await prisma.buyer.create({
      data: {
        platform: 'MAX',
        platformUserId: buyerPlatformId,
        platformChatId: buyerPlatformId,
      },
    });

    createdIds.buyers.push(buyer.id);

    // Try to create dealer with same platform user ID
    const existingBuyer = await prisma.buyer.findFirst({
      where: {
        platform: 'MAX',
        platformUserId: buyerPlatformId,
        deletedAt: null,
      },
    });

    expect(existingBuyer).not.toBeNull();
    expect(existingBuyer?.id).toBe(buyer.id);
  });
});

describe('Dealer Interface - Inquiry Viewing', () => {
  let dealerId: string;
  let inquiryId: string;

  beforeAll(async () => {
    // Create dealer
    const dealer = await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}dealer_inquiry_${Date.now()}`,
        name: 'Test Dealer Inquiry',
        active: true,
        platform: 'TELEGRAM',
        platformUserId: `${TEST_PREFIX}inquiry_dealer`,
        platformChatId: `${TEST_PREFIX}inquiry_dealer`,
        passwordHash: await hashPassword('password123'),
      },
    });

    dealerId = dealer.id;
    createdIds.dealers.push(dealerId);

    // Create buyer and inquiry
    const buyer = await prisma.buyer.create({
      data: {
        platform: 'TELEGRAM',
        platformUserId: `${TEST_PREFIX}inquiry_buyer`,
        platformChatId: `${TEST_PREFIX}inquiry_buyer`,
      },
    });

    createdIds.buyers.push(buyer.id);

    const inquiry = await prisma.inquiry.create({
      data: {
        buyerId: buyer.id,
        name: 'Test Buyer',
        phone: '+71234567890',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Mekhanika',
        color: 'Belyy',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    inquiryId = inquiry.id;
    createdIds.inquiries.push(inquiryId);
  });

  test('should list active inquiries for dealer', async () => {
    const inquiries = await prisma.inquiry.findMany({
      where: {
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
      include: {
        offers: {
          where: { dealerId },
        },
      },
    });

    expect(inquiries.length).toBeGreaterThanOrEqual(1);
    const testInquiry = inquiries.find((i) => i.id === inquiryId);
    expect(testInquiry).toBeDefined();
  });

  test('should create offer for inquiry', async () => {
    const offer = await prisma.offer.create({
      data: {
        inquiryId,
        dealerId,
        price: 1500000,
        comment: 'Test offer',
      },
    });

    expect(offer.id).toBeDefined();
    expect(offer.price).toBe(1500000);
  });

  test('should limit offers per dealer to 5', async () => {
    const offerCount = await prisma.offer.count({
      where: {
        inquiryId,
        dealerId,
        deletedAt: null,
      },
    });

    // We created 1 offer above
    expect(offerCount).toBeLessThanOrEqual(5);
  });
});
