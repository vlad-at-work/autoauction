import { describe, expect, test, beforeAll } from 'bun:test';
import { config } from 'dotenv';
import { prisma } from '@/lib/db';

config({ path: '.env.local' });

const TEST_PREFIX = 'test_api_offers_';
const BASE_URL = 'http://localhost:3000';

beforeAll(async () => {
  await prisma.offer.deleteMany({
    where: { comment: { startsWith: TEST_PREFIX } },
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

async function createTestDealerAndInquiry() {
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
      name: `${TEST_PREFIX}Inquiry`,
      phone: '79001234567',
      model: 'Granta',
      submodel: 'sedan',
      transmission: 'Механика',
      color: 'Белый',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { dealer, buyer, inquiry };
}

describe('POST /api/offers', () => {
  test('should create offer for dealer', async () => {
    const { dealer, inquiry } = await createTestDealerAndInquiry();

    const res = await fetch(`${BASE_URL}/api/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${dealer.username}:${dealer.username}`).toString('base64')}`,
      },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        price: 5000000,
        comment: `${TEST_PREFIX}Offer1`,
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.price).toBe(5000000);
    expect(data.comment).toBe(`${TEST_PREFIX}Offer1`);
  });

  test('should enforce max 5 offers per dealer per inquiry', async () => {
    const { dealer, inquiry } = await createTestDealerAndInquiry();

    // Create 5 offers
    for (let i = 0; i < 5; i++) {
      await prisma.offer.create({
        data: {
          inquiryId: inquiry.id,
          dealerId: dealer.id,
          price: 5000000 - i * 100000,
          comment: `${TEST_PREFIX}Offer${i}`,
        },
      });
    }

    // Try to create 6th offer
    const res = await fetch(`${BASE_URL}/api/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${dealer.username}:${dealer.username}`).toString('base64')}`,
      },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        price: 4500000,
        comment: `${TEST_PREFIX}Offer6`,
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('5');
  });

  test('should reject offer for expired inquiry', async () => {
    const { dealer, buyer } = await createTestDealerAndInquiry();

    const expiredInquiry = await prisma.inquiry.create({
      data: {
        buyerId: buyer.id,
        name: `${TEST_PREFIX}ExpiredInquiry`,
        phone: '79001234567',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Механика',
        color: 'Белый',
        expiresAt: new Date(Date.now() - 1000), // Expired
      },
    });

    const res = await fetch(`${BASE_URL}/api/offers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${dealer.username}:${dealer.username}`).toString('base64')}`,
      },
      body: JSON.stringify({
        inquiryId: expiredInquiry.id,
        price: 5000000,
        comment: `${TEST_PREFIX}ExpiredOffer`,
      }),
    });

    expect(res.status).toBe(410);
  });

  test('should require authentication', async () => {
    const { inquiry } = await createTestDealerAndInquiry();

    const res = await fetch(`${BASE_URL}/api/offers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inquiryId: inquiry.id,
        price: 5000000,
        comment: `${TEST_PREFIX}NoAuth`,
      }),
    });

    expect(res.status).toBe(401);
  });
});
