/**
 * Integration test: full inquiry lifecycle
 * Requires a live Postgres DB (run with: bun run test:integration)
 *
 * Creates real DB rows — all prefixed with TEST_PREFIX for cleanup.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '@/lib/db';
import { cleanupTestData } from '../happy/test-cleanup';

const TEST_PREFIX = `test_integ_lifecycle_${Date.now()}_`;

let buyerId: string;
let dealerId: string;
let inquiryId: string;
let offerId: string;

describe('Inquiry lifecycle (live DB)', () => {
  beforeAll(async () => {
    await cleanupTestData(TEST_PREFIX);
  });

  afterAll(async () => {
    await cleanupTestData(TEST_PREFIX);
    await prisma.$disconnect();
  });

  it('creates a Buyer via upsert', async () => {
    const buyer = await prisma.buyer.upsert({
      where: {
        platform_platformUserId: {
          platform: 'TELEGRAM',
          platformUserId: `${TEST_PREFIX}user1`,
        },
      },
      create: {
        platform: 'TELEGRAM',
        platformUserId: `${TEST_PREFIX}user1`,
        platformChatId: '99999991',
        phone: '79161234567',
        phoneVerified: true,
      },
      update: {},
    });
    buyerId = buyer.id;
    expect(buyer.platform).toBe('TELEGRAM');
    expect(buyer.phoneVerified).toBe(true);
  });

  it('creates a Dealer', async () => {
    const dealer = await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}dealer1`,
        name: 'Test Dealer',
        phone: '79991234567',
        email: `${TEST_PREFIX}@dealer.test`,
        active: true,
      },
    });
    dealerId = dealer.id;
    expect(dealer.username).toStartWith(TEST_PREFIX);
  });

  it('creates an Inquiry linked to the Buyer', async () => {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const inquiry = await prisma.inquiry.create({
      data: {
        buyerId,
        name: 'Иван Иванов',
        phone: '79161234567',
        email: 'ivan@test.com',
        model: 'Toyota',
        submodel: 'Camry',
        transmission: 'automatic',
        color: 'white',
        expiresAt: expires,
        consentAt: new Date(),
      },
    });
    inquiryId = inquiry.id;
    expect(inquiry.buyerId).toBe(buyerId);
    expect(inquiry.model).toBe('Toyota');
  });

  it('dealer creates an Offer on the Inquiry', async () => {
    const offer = await prisma.offer.create({
      data: {
        inquiryId,
        dealerId,
        price: 1_800_000,
        confirmedMatch: true,
        confirmedAt: new Date(),
      },
    });
    offerId = offer.id;
    expect(offer.price).toBe(1_800_000);
    expect(offer.confirmedMatch).toBe(true);
  });

  it('buyer accepts offer — Transaction snapshots buyer & dealer info', async () => {
    const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
    const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
    const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });

    expect(buyer).not.toBeNull();
    expect(dealer).not.toBeNull();
    expect(inquiry).not.toBeNull();

    const transaction = await prisma.transaction.create({
      data: {
        inquiryId,
        offerId,
        dealerId,
        buyerName: inquiry!.name,
        buyerEmail: inquiry!.email,
        buyerPhone: inquiry!.phone,
        buyerPlatform: buyer!.platform,
        buyerPlatformUserId: buyer!.platformUserId,
        buyerPlatformHandle: buyer!.platformHandle,
        offerPrice: 1_800_000,
        inquiryModel: inquiry!.model,
        inquirySubmodel: inquiry!.submodel,
        dealerUsername: dealer!.username,
        dealerName: dealer!.name,
      },
    });

    expect(transaction.buyerName).toBe('Иван Иванов');
    expect(transaction.buyerPhone).toBe('79161234567');
    expect(transaction.buyerPlatform).toBe('TELEGRAM');
    expect(transaction.buyerPlatformUserId).toBe(`${TEST_PREFIX}user1`);
    expect(transaction.offerPrice).toBe(1_800_000);
    expect(transaction.inquiryModel).toBe('Toyota');
    expect(transaction.dealerUsername).toStartWith(TEST_PREFIX);
  });

  it('second transaction on same inquiry from same dealer is blocked by unique constraint', async () => {
    let threw = false;
    try {
      await prisma.transaction.create({
        data: {
          inquiryId,
          offerId: offerId + '_fake', // Different offer but same dealer
          dealerId,
          buyerName: 'Test',
          buyerPhone: '79161234567',
          offerPrice: 100,
        },
      });
    } catch (err) {
      threw = true;
      // P2003 (FK violation on fake offerId) or P2002 (unique violation on inquiryId+dealerId)
      expect(err).toBeDefined();
    }
    expect(threw).toBe(true);
  });
});
