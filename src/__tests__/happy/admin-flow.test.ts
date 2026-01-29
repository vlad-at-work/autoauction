import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { config } from 'dotenv';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';

// Load environment variables before tests
config({ path: '.env.local' });

/**
 * Admin panel integration tests.
 * Tests CRUD operations via direct Prisma calls (simulating what admin actions do).
 * Run with: bun run test:live-db
 */

const TEST_PREFIX = 'test_admin_';

describe('Admin Panel CRUD Operations', () => {
  let buyerId: string = '';
  let dealerId: string = '';
  let inquiryId: string = '';
  let offerId: string = '';
  let leadId: string = '';

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.lead.deleteMany({
      where: {
        offer: {
          inquiry: {
            buyer: {
              platformUserId: { startsWith: TEST_PREFIX },
            },
          },
        },
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
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.lead.deleteMany({
      where: {
        offer: {
          inquiry: {
            buyer: {
              platformUserId: { startsWith: TEST_PREFIX },
            },
          },
        },
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

    await prisma.$disconnect();
  });

  describe('Buyer CRUD', () => {
    it('should create a buyer', async () => {
      const buyer = await prisma.buyer.create({
        data: {
          platform: Platform.MAX,
          platformUserId: `${TEST_PREFIX}buyer_1`,
          platformUserName: 'Test Admin Buyer',
        },
      });

      expect(buyer).toBeDefined();
      expect(buyer.id).toBeDefined();
      buyerId = buyer.id;

      const found = await prisma.buyer.findUnique({ where: { id: buyerId } });
      expect(found).toBeDefined();
      expect(found?.platformUserName).toBe('Test Admin Buyer');
    });

    it('should update a buyer', async () => {
      await prisma.buyer.update({
        where: { id: buyerId },
        data: { platformUserName: 'Updated Admin Buyer' },
      });

      const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
      expect(buyer?.platformUserName).toBe('Updated Admin Buyer');
    });

    it('should retrieve buyer with inquiries count', async () => {
      const buyer = await prisma.buyer.findUnique({
        where: { id: buyerId },
        include: { _count: { select: { inquiries: true } } },
      });

      expect(buyer).toBeDefined();
      expect(buyer?._count.inquiries).toBe(0);
    });
  });

  describe('Dealer CRUD', () => {
    it('should create a dealer', async () => {
      const dealer = await prisma.dealer.create({
        data: {
          username: `${TEST_PREFIX}dealer_1`,
          name: 'Test Admin Dealer',
          active: true,
        },
      });

      expect(dealer).toBeDefined();
      expect(dealer.id).toBeDefined();
      dealerId = dealer.id;

      const found = await prisma.dealer.findUnique({ where: { id: dealerId } });
      expect(found).toBeDefined();
      expect(found?.name).toBe('Test Admin Dealer');
      expect(found?.active).toBe(true);
    });

    it('should update dealer active status', async () => {
      await prisma.dealer.update({
        where: { id: dealerId },
        data: { active: false },
      });

      const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
      expect(dealer?.active).toBe(false);

      // Restore active status
      await prisma.dealer.update({
        where: { id: dealerId },
        data: { active: true },
      });
    });
  });

  describe('Inquiry CRUD', () => {
    it('should create an inquiry', async () => {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const inquiry = await prisma.inquiry.create({
        data: {
          buyerId,
          name: 'Test Buyer Name',
          phone: '+79991234567',
          email: 'test@example.com',
          model: 'Vesta',
          submodel: 'SW Cross',
          transmission: 'Автомат',
          color: 'Белый',
          comment: 'Test comment',
          expiresAt,
        },
      });

      expect(inquiry).toBeDefined();
      expect(inquiry.id).toBeDefined();
      inquiryId = inquiry.id;

      const found = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
      expect(found).toBeDefined();
      expect(found?.model).toBe('Vesta');
    });

    it('should update an inquiry', async () => {
      await prisma.inquiry.update({
        where: { id: inquiryId },
        data: { comment: 'Updated comment' },
      });

      const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
      expect(inquiry?.comment).toBe('Updated comment');
    });

    it('should filter inquiries by status', async () => {
      const now = new Date();

      const activeInquiries = await prisma.inquiry.findMany({
        where: {
          buyer: { platformUserId: { startsWith: TEST_PREFIX } },
          expiresAt: { gte: now },
        },
      });

      expect(activeInquiries.length).toBeGreaterThan(0);
    });
  });

  describe('Offer CRUD', () => {
    it('should create an offer', async () => {
      const offer = await prisma.offer.create({
        data: {
          inquiryId,
          dealerId,
          price: 1500000,
          comment: 'Test offer comment',
        },
      });

      expect(offer).toBeDefined();
      expect(offer.id).toBeDefined();
      offerId = offer.id;

      const found = await prisma.offer.findUnique({ where: { id: offerId } });
      expect(found).toBeDefined();
      expect(found?.price).toBe(1500000);
    });

    it('should update an offer', async () => {
      await prisma.offer.update({
        where: { id: offerId },
        data: { price: 1450000, comment: 'Updated offer comment' },
      });

      const offer = await prisma.offer.findUnique({ where: { id: offerId } });
      expect(offer?.price).toBe(1450000);
      expect(offer?.comment).toBe('Updated offer comment');
    });

    it('should retrieve offer with relations', async () => {
      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: {
          inquiry: { include: { buyer: true } },
          dealer: true,
          _count: { select: { leads: true } },
        },
      });

      expect(offer).toBeDefined();
      expect(offer?.inquiry.buyerId).toBe(buyerId);
      expect(offer?.dealer.id).toBe(dealerId);
      expect(offer?._count.leads).toBe(0);
    });
  });

  describe('Lead Operations', () => {
    it('should create a lead (simulating offer acceptance)', async () => {
      const lead = await prisma.lead.create({
        data: {
          offerId,
          buyerName: 'Test Buyer Name',
          buyerPhone: '+79991234567',
          buyerEmail: 'test@example.com',
        },
      });

      expect(lead).toBeDefined();
      leadId = lead.id;
    });

    it('should retrieve lead with full context', async () => {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          offer: {
            include: {
              inquiry: { include: { buyer: true } },
              dealer: true,
            },
          },
        },
      });

      expect(lead).toBeDefined();
      expect(lead?.offer.inquiry.buyer.id).toBe(buyerId);
      expect(lead?.offer.dealer.id).toBe(dealerId);
    });

    it('should delete a lead', async () => {
      await prisma.lead.delete({ where: { id: leadId } });

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      expect(lead).toBeNull();
    });
  });

  describe('Cascading Deletes', () => {
    it('should delete offer', async () => {
      expect(offerId).toBeTruthy();
      await prisma.offer.delete({ where: { id: offerId } });

      const offer = await prisma.offer.findUnique({ where: { id: offerId } });
      expect(offer).toBeNull();
    });

    it('should delete inquiry', async () => {
      expect(inquiryId).toBeTruthy();
      await prisma.inquiry.delete({ where: { id: inquiryId } });

      const inquiry = await prisma.inquiry.findUnique({ where: { id: inquiryId } });
      expect(inquiry).toBeNull();
    });

    it('should delete dealer', async () => {
      expect(dealerId).toBeTruthy();
      await prisma.dealer.delete({ where: { id: dealerId } });

      const dealer = await prisma.dealer.findUnique({ where: { id: dealerId } });
      expect(dealer).toBeNull();
    });

    it('should delete buyer', async () => {
      expect(buyerId).toBeTruthy();
      await prisma.buyer.delete({ where: { id: buyerId } });

      const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
      expect(buyer).toBeNull();
    });
  });

  describe('Dashboard Stats', () => {
    it('should retrieve dashboard statistics', async () => {
      const now = new Date();

      const [
        buyersCount,
        inquiriesCount,
        activeInquiriesCount,
        dealersCount,
        offersCount,
        leadsCount,
      ] = await Promise.all([
        prisma.buyer.count(),
        prisma.inquiry.count(),
        prisma.inquiry.count({ where: { expiresAt: { gte: now } } }),
        prisma.dealer.count(),
        prisma.offer.count(),
        prisma.lead.count(),
      ]);

      expect(typeof buyersCount).toBe('number');
      expect(typeof inquiriesCount).toBe('number');
      expect(typeof activeInquiriesCount).toBe('number');
      expect(typeof dealersCount).toBe('number');
      expect(typeof offersCount).toBe('number');
      expect(typeof leadsCount).toBe('number');
    });
  });
});
