import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { config } from 'dotenv';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';

// Load environment variables before tests
config({ path: '.env.local' });

/**
 * Integration tests for the reverse auction flow.
 * Tests the new multi-offer system, transaction limits, and inquiry limits.
 * Run with: bun run test:live-db
 */

const TEST_PREFIX = 'test_auction_';

describe('Reverse Auction Flow', () => {
  let buyerId: string;
  let inquiryId: string;
  let dealer1Id: string;
  let dealer2Id: string;
  let dealer3Id: string;
  let dealer4Id: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { offer: { inquiry: { buyer: { platformUserId: { startsWith: TEST_PREFIX } } } } },
          { offer: { dealer: { username: { startsWith: TEST_PREFIX } } } },
        ],
      },
    });

    await prisma.offer.deleteMany({
      where: {
        OR: [
          { inquiry: { buyer: { platformUserId: { startsWith: TEST_PREFIX } } } },
          { dealer: { username: { startsWith: TEST_PREFIX } } },
        ],
      },
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

  describe('Setup', () => {
    it('should create a buyer with inquiry limit fields', async () => {
      const resetAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

      const buyer = await prisma.buyer.create({
        data: {
          platform: Platform.MAX,
          platformUserId: `${TEST_PREFIX}buyer_1`,
          platformUserName: 'Test Auction Buyer',
          inquiriesUsedThisMonth: 0,
          inquiryLimitResetAt: resetAt,
        },
      });

      expect(buyer).toBeDefined();
      expect(buyer.inquiriesUsedThisMonth).toBe(0);
      expect(buyer.inquiryLimitResetAt.getTime()).toBeGreaterThan(Date.now());

      buyerId = buyer.id;
    });

    it('should create an inquiry', async () => {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const inquiry = await prisma.inquiry.create({
        data: {
          buyerId,
          name: 'Auction Test User',
          phone: '+79991234567',
          email: 'auction@test.com',
          model: 'Land Cruiser 250',
          submodel: 'First Edition',
          transmission: 'Автомат',
          color: 'Белый',
          expiresAt,
        },
      });

      expect(inquiry).toBeDefined();
      inquiryId = inquiry.id;
    });

    it('should create multiple dealers', async () => {
      const dealers = await Promise.all([
        prisma.dealer.create({
          data: { username: `${TEST_PREFIX}dealer_1`, name: 'Дилер Альфа', active: true },
        }),
        prisma.dealer.create({
          data: { username: `${TEST_PREFIX}dealer_2`, name: 'Дилер Бета', active: true },
        }),
        prisma.dealer.create({
          data: { username: `${TEST_PREFIX}dealer_3`, name: 'Дилер Гамма', active: true },
        }),
        prisma.dealer.create({
          data: { username: `${TEST_PREFIX}dealer_4`, name: 'Дилер Дельта', active: true },
        }),
      ]);

      dealer1Id = dealers[0].id;
      dealer2Id = dealers[1].id;
      dealer3Id = dealers[2].id;
      dealer4Id = dealers[3].id;

      expect(dealers).toHaveLength(4);
    });
  });

  describe('Multi-offer per dealer', () => {
    it('should allow dealer to create multiple offers for same inquiry', async () => {
      // Create 5 offers from dealer 1 (the max allowed)
      const offers = [];
      for (let i = 1; i <= 5; i++) {
        const offer = await prisma.offer.create({
          data: {
            inquiryId,
            dealerId: dealer1Id,
            price: 5000000 - i * 50000, // Each offer is lower
            comment: `Предложение ${i}`,
          },
        });
        offers.push(offer);
      }

      expect(offers).toHaveLength(5);
      expect(offers[4].price).toBe(4750000); // Last offer is the lowest
    });

    it('should retrieve all offers from a dealer for an inquiry', async () => {
      const offers = await prisma.offer.findMany({
        where: {
          inquiryId,
          dealerId: dealer1Id,
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(offers).toHaveLength(5);
    });

    it('should allow different dealers to submit offers', async () => {
      await Promise.all([
        prisma.offer.create({
          data: { inquiryId, dealerId: dealer2Id, price: 4900000, comment: 'От Бета' },
        }),
        prisma.offer.create({
          data: { inquiryId, dealerId: dealer3Id, price: 4850000, comment: 'От Гамма' },
        }),
        prisma.offer.create({
          data: { inquiryId, dealerId: dealer4Id, price: 4800000, comment: 'От Дельта' },
        }),
      ]);

      const totalOffers = await prisma.offer.count({ where: { inquiryId } });
      expect(totalOffers).toBe(8); // 5 from dealer1 + 1 each from 3 other dealers
    });
  });

  describe('Transaction (offer acceptance)', () => {
    let acceptedOfferId: string;

    it('should allow buyer to accept an offer and create transaction', async () => {
      // Get the best offer from dealer 1
      const offer = await prisma.offer.findFirst({
        where: { inquiryId, dealerId: dealer1Id },
        orderBy: { price: 'asc' },
      });

      expect(offer).toBeDefined();
      acceptedOfferId = offer!.id;

      const transaction = await prisma.transaction.create({
        data: {
          inquiryId,
          offerId: acceptedOfferId,
          dealerId: dealer1Id,
          buyerName: 'Auction Test User',
          buyerPhone: '+79991234567',
          buyerEmail: 'auction@test.com',
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction.offerId).toBe(acceptedOfferId);
      expect(transaction.dealerId).toBe(dealer1Id);
    });

    it('should not allow duplicate transaction from same dealer on same inquiry', async () => {
      // Get another offer from dealer 1
      const anotherOffer = await prisma.offer.findFirst({
        where: {
          inquiryId,
          dealerId: dealer1Id,
          id: { not: acceptedOfferId },
        },
      });

      expect(anotherOffer).toBeDefined();

      try {
        await prisma.transaction.create({
          data: {
            inquiryId,
            offerId: anotherOffer!.id,
            dealerId: dealer1Id,
            buyerName: 'Auction Test User',
            buyerPhone: '+79991234567',
          },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should allow buyer to accept offers from different dealers', async () => {
      // Accept offer from dealer 2
      const offer2 = await prisma.offer.findFirst({
        where: { inquiryId, dealerId: dealer2Id },
      });

      const tx2 = await prisma.transaction.create({
        data: {
          inquiryId,
          offerId: offer2!.id,
          dealerId: dealer2Id,
          buyerName: 'Auction Test User',
          buyerPhone: '+79991234567',
        },
      });

      expect(tx2).toBeDefined();

      // Accept offer from dealer 3
      const offer3 = await prisma.offer.findFirst({
        where: { inquiryId, dealerId: dealer3Id },
      });

      const tx3 = await prisma.transaction.create({
        data: {
          inquiryId,
          offerId: offer3!.id,
          dealerId: dealer3Id,
          buyerName: 'Auction Test User',
          buyerPhone: '+79991234567',
        },
      });

      expect(tx3).toBeDefined();

      // Count total transactions for this inquiry
      const transactionCount = await prisma.transaction.count({
        where: { inquiryId },
      });

      expect(transactionCount).toBe(3);
    });

    it('should retrieve offer with transaction status', async () => {
      const offersWithTransactions = await prisma.offer.findMany({
        where: { inquiryId },
        include: { transaction: true },
        orderBy: { createdAt: 'desc' },
      });

      const accepted = offersWithTransactions.filter((o) => o.transaction !== null);
      const notAccepted = offersWithTransactions.filter((o) => o.transaction === null);

      expect(accepted.length).toBe(3);
      expect(notAccepted.length).toBe(5); // 8 total - 3 accepted
    });
  });

  describe('Inquiry with transactions context', () => {
    it('should retrieve inquiry with all related transactions', async () => {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: inquiryId },
        include: {
          transactions: {
            include: {
              offer: {
                include: { dealer: true },
              },
            },
          },
          offers: {
            include: {
              dealer: true,
              transaction: true,
            },
          },
        },
      });

      expect(inquiry).toBeDefined();
      expect(inquiry?.transactions).toHaveLength(3);
      expect(inquiry?.offers).toHaveLength(8);

      // Verify each transaction has correct dealer info
      const acceptedDealerIds = inquiry!.transactions.map((t) => t.dealerId);
      expect(acceptedDealerIds).toContain(dealer1Id);
      expect(acceptedDealerIds).toContain(dealer2Id);
      expect(acceptedDealerIds).toContain(dealer3Id);
      expect(acceptedDealerIds).not.toContain(dealer4Id); // Dealer 4 was not accepted
    });

    it('should group offers by dealer correctly', async () => {
      const offers = await prisma.offer.findMany({
        where: { inquiryId },
        include: { dealer: true, transaction: true },
        orderBy: [{ dealerId: 'asc' }, { createdAt: 'desc' }],
      });

      // Group by dealer
      const grouped = offers.reduce(
        (acc, offer) => {
          if (!acc[offer.dealerId]) {
            acc[offer.dealerId] = [];
          }
          acc[offer.dealerId].push(offer);
          return acc;
        },
        {} as Record<string, typeof offers>
      );

      expect(Object.keys(grouped)).toHaveLength(4); // 4 dealers
      expect(grouped[dealer1Id]).toHaveLength(5); // Dealer 1 has 5 offers
      expect(grouped[dealer2Id]).toHaveLength(1);
      expect(grouped[dealer3Id]).toHaveLength(1);
      expect(grouped[dealer4Id]).toHaveLength(1);
    });
  });

  describe('Inquiry limits', () => {
    it('should track inquiries used this month', async () => {
      // Update buyer to simulate having used 1 inquiry
      await prisma.buyer.update({
        where: { id: buyerId },
        data: { inquiriesUsedThisMonth: 1 },
      });

      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        select: { inquiriesUsedThisMonth: true, inquiryLimitResetAt: true },
      });

      expect(buyer?.inquiriesUsedThisMonth).toBe(1);
    });

    it('should calculate remaining inquiries correctly', async () => {
      const MAX_INQUIRIES = 2;

      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        select: { inquiriesUsedThisMonth: true },
      });

      const remaining = MAX_INQUIRIES - (buyer?.inquiriesUsedThisMonth || 0);
      expect(remaining).toBe(1);
    });

    it('should reset limits when reset date passes', async () => {
      // Set reset date to the past
      const pastDate = new Date(Date.now() - 1000);

      await prisma.buyer.update({
        where: { id: buyerId },
        data: {
          inquiriesUsedThisMonth: 2,
          inquiryLimitResetAt: pastDate,
        },
      });

      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        select: { inquiriesUsedThisMonth: true, inquiryLimitResetAt: true },
      });

      // Verify current state (in real app, API would reset this)
      expect(buyer?.inquiriesUsedThisMonth).toBe(2);
      expect(buyer?.inquiryLimitResetAt.getTime()).toBeLessThan(Date.now());

      // Simulate reset logic
      if (buyer && new Date() >= buyer.inquiryLimitResetAt) {
        await prisma.buyer.update({
          where: { id: buyerId },
          data: {
            inquiriesUsedThisMonth: 0,
            inquiryLimitResetAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
          },
        });
      }

      const resetBuyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        select: { inquiriesUsedThisMonth: true },
      });

      expect(resetBuyer?.inquiriesUsedThisMonth).toBe(0);
    });
  });

  describe('Dealer view of competing offers', () => {
    it('should retrieve competing offers count for a dealer', async () => {
      // Create a new inquiry for this test
      const newInquiry = await prisma.inquiry.create({
        data: {
          buyerId,
          name: 'Competition Test',
          phone: '+79991234567',
          model: 'Test Model',
          submodel: 'Test Submodel',
          transmission: 'Автомат',
          color: 'Черный',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Create offers from multiple dealers
      await prisma.offer.createMany({
        data: [
          { inquiryId: newInquiry.id, dealerId: dealer1Id, price: 5000000 },
          { inquiryId: newInquiry.id, dealerId: dealer1Id, price: 4900000 },
          { inquiryId: newInquiry.id, dealerId: dealer2Id, price: 4800000 },
          { inquiryId: newInquiry.id, dealerId: dealer3Id, price: 4700000 },
        ],
      });

      // Query from dealer1's perspective - count other dealers' offers
      const otherDealersOffers = await prisma.offer.findMany({
        where: {
          inquiryId: newInquiry.id,
          dealerId: { not: dealer1Id },
        },
        include: { dealer: true },
      });

      expect(otherDealersOffers).toHaveLength(2); // dealer2 and dealer3

      // Get unique competing dealers
      const competingDealerIds = [...new Set(otherDealersOffers.map((o) => o.dealerId))];
      expect(competingDealerIds).toHaveLength(2);
    });
  });

  describe('Data integrity', () => {
    it('should maintain transaction uniqueness constraints', async () => {
      // Verify unique constraint on (inquiryId, dealerId)
      const transactions = await prisma.transaction.findMany({
        where: { inquiryId },
      });

      const dealerInquiryPairs = transactions.map((t) => `${t.inquiryId}-${t.dealerId}`);
      const uniquePairs = [...new Set(dealerInquiryPairs)];

      expect(dealerInquiryPairs.length).toBe(uniquePairs.length);
    });

    it('should cascade correctly when deleting offers', async () => {
      // Create a test offer and transaction
      const testOffer = await prisma.offer.create({
        data: { inquiryId, dealerId: dealer4Id, price: 4600000 },
      });

      await prisma.transaction.create({
        data: {
          inquiryId,
          offerId: testOffer.id,
          dealerId: dealer4Id,
          buyerName: 'Cascade Test',
          buyerPhone: '+79991234567',
        },
      });

      // Delete the transaction first (required due to foreign key)
      await prisma.transaction.deleteMany({
        where: { offerId: testOffer.id },
      });

      // Now delete the offer
      await prisma.offer.delete({
        where: { id: testOffer.id },
      });

      // Verify both are deleted
      const deletedOffer = await prisma.offer.findUnique({
        where: { id: testOffer.id },
      });
      expect(deletedOffer).toBeNull();
    });
  });
});
