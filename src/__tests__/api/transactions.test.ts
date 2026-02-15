import { describe, expect, test, beforeAll } from 'bun:test';
import { config } from 'dotenv';
import { prisma } from '@/lib/db';

config({ path: '.env.local' });

const TEST_PREFIX = 'test_api_transactions_';
const BASE_URL = 'http://localhost:3000';

beforeAll(async () => {
  await prisma.transaction.deleteMany({
    where: { buyerName: { startsWith: TEST_PREFIX } },
  });
  await prisma.offer.deleteMany({
    where: { additionalComments: { startsWith: TEST_PREFIX } },
  });
  await prisma.inquiry.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
  await prisma.buyer.deleteMany({
    where: { platformUserId: { startsWith: TEST_PREFIX } },
  });
  await prisma.dealer.deleteMany({
    where: { username: { startsWith: TEST_PREFIX } },
  });
});

async function createTestData() {
  const dealer = await prisma.dealer.create({
    data: {
      username: `${TEST_PREFIX}${Date.now()}_dealer`,
      name: `${TEST_PREFIX}Dealer`,
      platform: 'TELEGRAM',
      platformUserId: `${TEST_PREFIX}dealer_${Date.now()}`,
      platformChatId: `${TEST_PREFIX}dealer_${Date.now()}`,
      active: true,
    },
  });

  const buyer = await prisma.buyer.create({
    data: {
      platform: 'TELEGRAM',
      platformUserId: `${TEST_PREFIX}buyer_${Date.now()}`,
      platformChatId: `${TEST_PREFIX}buyer_${Date.now()}`,
    },
  });

  const inquiry = await prisma.inquiry.create({
    data: {
      buyerId: buyer.id,
      name: `${TEST_PREFIX}Buyer`,
      email: 'test@example.com',
      phone: '79001234567',
      model: 'Granta',
      submodel: 'sedan',
      transmission: 'Механика',
      color: 'Белый',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const offer = await prisma.offer.create({
    data: {
      inquiryId: inquiry.id,
      dealerId: dealer.id,
      price: 5000000,
      confirmedMatch: true,
      additionalComments: `${TEST_PREFIX}Offer`,
    },
  });

  return { dealer, buyer, inquiry, offer };
}

describe('POST /api/transactions', () => {
  test('should create transaction (accept offer)', async () => {
    const { offer, inquiry, buyer } = await createTestData();

    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: offer.id,
        platformUserId: buyer.platformUserId,
        platform: 'TELEGRAM',
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.buyerName).toBe(inquiry.name);
    expect(data.buyerPhone).toBe(inquiry.phone);
    expect(data.price).toBe(offer.price);

    // Verify transaction was created in DB
    const transaction = await prisma.transaction.findFirst({
      where: { offerId: offer.id },
    });
    expect(transaction).toBeDefined();
    expect(transaction?.buyerName).toBe(`${TEST_PREFIX}Buyer`);
  });

  test('should enforce max 3 transactions per inquiry', async () => {
    const { buyer, inquiry } = await createTestData();

    // Create 3 dealers with offers and transactions
    for (let i = 0; i < 3; i++) {
      const dealer = await prisma.dealer.create({
        data: {
          username: `${TEST_PREFIX}${Date.now()}_dealer${i}`,
          name: `${TEST_PREFIX}Dealer${i}`,
          platform: 'TELEGRAM',
          platformUserId: `${TEST_PREFIX}dealer${i}_${Date.now()}`,
          platformChatId: `${TEST_PREFIX}dealer${i}_${Date.now()}`,
          active: true,
        },
      });

      const offer = await prisma.offer.create({
        data: {
          inquiryId: inquiry.id,
          dealerId: dealer.id,
          price: 5000000 - i * 100000,
          confirmedMatch: true,
          additionalComments: `${TEST_PREFIX}Offer${i}`,
        },
      });

      await prisma.transaction.create({
        data: {
          offerId: offer.id,
          dealerId: dealer.id,
          inquiryId: inquiry.id,
          buyerName: inquiry.name,
          buyerEmail: inquiry.email,
          buyerPhone: inquiry.phone,
          acceptedAt: new Date(),
        },
      });
    }

    // Try to create 4th transaction
    const dealer4 = await prisma.dealer.create({
      data: {
        username: `${TEST_PREFIX}${Date.now()}_dealer4`,
        name: `${TEST_PREFIX}Dealer4`,
        platform: 'TELEGRAM',
        platformUserId: `${TEST_PREFIX}dealer4_${Date.now()}`,
        platformChatId: `${TEST_PREFIX}dealer4_${Date.now()}`,
        active: true,
      },
    });

    const offer4 = await prisma.offer.create({
      data: {
        inquiryId: inquiry.id,
        dealerId: dealer4.id,
        price: 4500000,
        confirmedMatch: true,
        additionalComments: `${TEST_PREFIX}Offer4`,
      },
    });

    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: offer4.id,
        platformUserId: buyer.platformUserId,
        platform: 'TELEGRAM',
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('3');
  });

  test('should prevent duplicate transaction for same dealer', async () => {
    const { offer, buyer } = await createTestData();

    // Create first transaction
    await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: offer.id,
        platformUserId: buyer.platformUserId,
        platform: 'TELEGRAM',
      }),
    });

    // Try to create duplicate
    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: offer.id,
        platformUserId: buyer.platformUserId,
        platform: 'TELEGRAM',
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/уже принято|уже существует/);
  });

  test('should reject expired inquiry offers', async () => {
    const { dealer, buyer } = await createTestData();

    const expiredInquiry = await prisma.inquiry.create({
      data: {
        buyerId: buyer.id,
        name: `${TEST_PREFIX}ExpiredInquiry`,
        phone: '79001234567',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Механика',
        color: 'Белый',
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const expiredOffer = await prisma.offer.create({
      data: {
        inquiryId: expiredInquiry.id,
        dealerId: dealer.id,
        price: 5000000,
        confirmedMatch: true,
        additionalComments: `${TEST_PREFIX}ExpiredOffer`,
      },
    });

    const res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: expiredOffer.id,
        platformUserId: buyer.platformUserId,
        platform: 'TELEGRAM',
      }),
    });

    expect(res.status).toBe(410);
  });
});
