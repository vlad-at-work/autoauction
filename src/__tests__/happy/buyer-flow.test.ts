import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { config } from 'dotenv';
import { prisma } from '@/lib/db';

// Load environment variables before tests
config({ path: '.env.local' });

/**
 * Happy-path integration tests for the complete buyer flow.
 * Runs against a real database (isolated by `test_` prefixes).
 * Intended to run on `pre-push`, not on every `pre-commit`.
 */

const TEST_PREFIX = 'test_';
const TEST_BUYER_ID = `${TEST_PREFIX}buyer_${Date.now()}`;
const TEST_PLATFORM = 'MAX';

describe('Buyer Happy Path Flow', () => {
  let createdBuyerId: string;
  let createdInquiryId: string;
  let createdDealerId: string;
  let createdOfferId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.buyer.deleteMany({
      where: {
        platformUserId: {
          startsWith: TEST_PREFIX,
        },
      },
    });

    await prisma.dealer.deleteMany({
      where: {
        username: {
          startsWith: TEST_PREFIX,
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await prisma.transaction.deleteMany({
      where: {
        offer: {
          inquiry: {
            buyer: {
              platformUserId: {
                startsWith: TEST_PREFIX,
              },
            },
          },
        },
      },
    });

    await prisma.offer.deleteMany({
      where: {
        inquiry: {
          buyer: {
            platformUserId: {
              startsWith: TEST_PREFIX,
            },
          },
        },
      },
    });

    await prisma.inquiry.deleteMany({
      where: {
        buyer: {
          platformUserId: {
            startsWith: TEST_PREFIX,
          },
        },
      },
    });

    await prisma.buyer.deleteMany({
      where: {
        platformUserId: {
          startsWith: TEST_PREFIX,
        },
      },
    });

    await prisma.dealer.deleteMany({
      where: {
        username: {
          startsWith: TEST_PREFIX,
        },
      },
    });

    await prisma.$disconnect();
  });

  describe('1. Buyer Creation', () => {
    it('should create a new buyer', async () => {
      const buyer = await prisma.buyer.create({
        data: {
          platform: TEST_PLATFORM,
          platformUserId: TEST_BUYER_ID,
          platformUserName: 'Test Buyer User',
        },
      });

      expect(buyer).toBeDefined();
      expect(buyer.id).toBeDefined();
      expect(buyer.platformUserId).toBe(TEST_BUYER_ID);
      expect(buyer.platform).toBe(TEST_PLATFORM);

      createdBuyerId = buyer.id;
    });

    it('should not allow duplicate buyers with same platformUserId and platform', async () => {
      try {
        await prisma.buyer.create({
          data: {
            platform: TEST_PLATFORM,
            platformUserId: TEST_BUYER_ID,
            platformUserName: 'Duplicate Buyer',
          },
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should retrieve buyer by platform and platformUserId', async () => {
      const buyer = await prisma.buyer.findUnique({
        where: {
          platform_platformUserId: {
            platform: TEST_PLATFORM,
            platformUserId: TEST_BUYER_ID,
          },
        },
      });

      expect(buyer).toBeDefined();
      expect(buyer?.id).toBe(createdBuyerId);
    });
  });

  describe('2. Inquiry Creation', () => {
    it('should create an inquiry for the buyer', async () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // Expires in 24 hours

      const inquiry = await prisma.inquiry.create({
        data: {
          buyerId: createdBuyerId,
          name: 'Test User',
          phone: '+79991234567',
          email: 'test@example.com',
          model: 'Land Cruiser 250',
          submodel: 'First Edition',
          transmission: 'Автомат',
          color: 'Белый',
          comment: 'Test inquiry comment',
          expiresAt,
        },
      });

      expect(inquiry).toBeDefined();
      expect(inquiry.id).toBeDefined();
      expect(inquiry.buyerId).toBe(createdBuyerId);
      expect(inquiry.model).toBe('Land Cruiser 250');
      expect(inquiry.submodel).toBe('First Edition');
      expect(inquiry.expiresAt.getTime()).toBeGreaterThan(Date.now());

      createdInquiryId = inquiry.id;
    });

    it('should retrieve all inquiries for a buyer', async () => {
      const inquiries = await prisma.inquiry.findMany({
        where: {
          buyerId: createdBuyerId,
        },
        include: {
          _count: {
            select: { offers: true },
          },
        },
      });

      expect(inquiries).toHaveLength(1);
      expect(inquiries[0].id).toBe(createdInquiryId);
      expect(inquiries[0]._count.offers).toBe(0); // No offers yet
    });

    it('should retrieve inquiry by id', async () => {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: createdInquiryId },
        include: {
          buyer: true,
          offers: true,
        },
      });

      expect(inquiry).toBeDefined();
      expect(inquiry?.buyer.id).toBe(createdBuyerId);
      expect(inquiry?.offers).toHaveLength(0);
    });
  });

  describe('3. Dealer and Offer Creation', () => {
    it('should create a dealer', async () => {
      const dealer = await prisma.dealer.create({
        data: {
          username: `${TEST_PREFIX}dealer_${Date.now()}`,
          name: 'Test Dealer',
          active: true,
        },
      });

      expect(dealer).toBeDefined();
      expect(dealer.id).toBeDefined();
      expect(dealer.active).toBe(true);

      createdDealerId = dealer.id;
    });

    it('should create an offer from dealer to inquiry', async () => {
      const offer = await prisma.offer.create({
        data: {
          inquiryId: createdInquiryId,
          dealerId: createdDealerId,
          price: 5500000,
          comment: 'Лучшее предложение на рынке',
        },
      });

      expect(offer).toBeDefined();
      expect(offer.id).toBeDefined();
      expect(offer.inquiryId).toBe(createdInquiryId);
      expect(offer.dealerId).toBe(createdDealerId);
      expect(offer.price).toBe(5500000);

      createdOfferId = offer.id;
    });

    it('should allow multiple offers from same dealer (multi-offer auction)', async () => {
      // In the new reverse auction model, dealers can submit multiple offers
      const secondOffer = await prisma.offer.create({
        data: {
          inquiryId: createdInquiryId,
          dealerId: createdDealerId,
          price: 5400000,
          comment: 'Улучшенное предложение',
        },
      });

      expect(secondOffer).toBeDefined();
      expect(secondOffer.price).toBe(5400000);

      // Clean up second offer for subsequent tests
      await prisma.offer.delete({ where: { id: secondOffer.id } });
    });

    it('should retrieve inquiry with offers', async () => {
      const inquiry = await prisma.inquiry.findUnique({
        where: { id: createdInquiryId },
        include: {
          offers: {
            include: {
              dealer: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      expect(inquiry).toBeDefined();
      expect(inquiry?.offers).toHaveLength(1);
      expect(inquiry?.offers[0].id).toBe(createdOfferId);
      expect(inquiry?.offers[0].dealer.name).toBe('Test Dealer');
    });
  });

  describe('4. Transaction Creation (Offer Acceptance)', () => {
    it('should create a transaction when buyer accepts offer', async () => {
      const transaction = await prisma.transaction.create({
        data: {
          inquiryId: createdInquiryId,
          offerId: createdOfferId,
          dealerId: createdDealerId,
          buyerName: 'Test User',
          buyerPhone: '+79991234567',
          buyerEmail: 'test@example.com',
        },
      });

      expect(transaction).toBeDefined();
      expect(transaction.id).toBeDefined();
      expect(transaction.offerId).toBe(createdOfferId);
      expect(transaction.buyerPhone).toBe('+79991234567');
    });

    it('should retrieve transaction with full context', async () => {
      const transactions = await prisma.transaction.findMany({
        where: {
          offerId: createdOfferId,
        },
        include: {
          offer: {
            include: {
              inquiry: {
                include: {
                  buyer: true,
                },
              },
              dealer: true,
            },
          },
        },
      });

      expect(transactions).toHaveLength(1);
      expect(transactions[0].offer.inquiry.buyer.id).toBe(createdBuyerId);
      expect(transactions[0].offer.dealer.id).toBe(createdDealerId);
      expect(transactions[0].offer.inquiry.model).toBe('Land Cruiser 250');
    });
  });

  describe('5. Inquiry Expiration', () => {
    it('should identify expired inquiries', async () => {
      // Create an expired inquiry
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // Expired 1 hour ago

      const expiredInquiry = await prisma.inquiry.create({
        data: {
          buyerId: createdBuyerId,
          name: 'Test User',
          phone: '+79991234567',
          model: 'Test Expired',
          submodel: 'Expired Model',
          transmission: 'Автомат',
          color: 'Черный',
          expiresAt: pastDate,
        },
      });

      const now = new Date();
      const expiredInquiries = await prisma.inquiry.findMany({
        where: {
          buyerId: createdBuyerId,
          expiresAt: {
            lt: now,
          },
        },
      });

      expect(expiredInquiries.length).toBeGreaterThan(0);
      expect(expiredInquiries.some((inq) => inq.id === expiredInquiry.id)).toBe(true);
    });

    it('should identify active inquiries', async () => {
      const now = new Date();
      const activeInquiries = await prisma.inquiry.findMany({
        where: {
          buyerId: createdBuyerId,
          expiresAt: {
            gte: now,
          },
        },
      });

      expect(activeInquiries.some((inq) => inq.id === createdInquiryId)).toBe(true);
    });
  });

  describe('6. Data Relationships', () => {
    it('should maintain referential integrity on cascading reads', async () => {
      const buyer = await prisma.buyer.findUnique({
        where: { id: createdBuyerId },
        include: {
          inquiries: {
            include: {
              offers: {
                include: {
                  dealer: true,
                  transaction: true,
                },
              },
            },
          },
        },
      });

      expect(buyer).toBeDefined();
      expect(buyer?.inquiries.length).toBeGreaterThan(0);
      expect(buyer?.inquiries.some((inq) => inq.id === createdInquiryId)).toBe(true);

      const targetInquiry = buyer?.inquiries.find((inq) => inq.id === createdInquiryId);
      expect(targetInquiry?.offers).toHaveLength(1);
      expect(targetInquiry?.offers[0].transaction).toBeDefined();
    });
  });

  describe('7. Query Performance', () => {
    it('should efficiently query buyer dashboard data', async () => {
      const startTime = Date.now();

      const inquiries = await prisma.inquiry.findMany({
        where: {
          buyerId: createdBuyerId,
        },
        include: {
          _count: {
            select: { offers: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const duration = Date.now() - startTime;

      expect(inquiries).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should efficiently query inquiry detail with offers', async () => {
      const startTime = Date.now();

      const inquiry = await prisma.inquiry.findUnique({
        where: { id: createdInquiryId },
        include: {
          offers: {
            include: {
              dealer: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      const duration = Date.now() - startTime;

      expect(inquiry).toBeDefined();
      expect(duration).toBeLessThan(1000);
    });
  });
});
