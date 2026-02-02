import { describe, expect, test, beforeAll } from 'bun:test';
import { config } from 'dotenv';
import { prisma } from '@/lib/db';

config({ path: '.env.local' });

const TEST_PREFIX = 'test_api_inquiries_';
const BASE_URL = 'http://localhost:3000';

beforeAll(async () => {
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

describe('POST /api/inquiries', () => {
  test('should create inquiry and buyer if not exists', async () => {
    const platformUserId = `${TEST_PREFIX}${Date.now()}_1`;

    const res = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'TELEGRAM',
        platformUserId,
        platformChatId: platformUserId,
        name: `${TEST_PREFIX}Buyer1`,
        phone: '79001234567',
        email: 'test@example.com',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Механика',
        color: 'Белый',
        consent: true,
      }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.name).toBe(`${TEST_PREFIX}Buyer1`);

    // Verify buyer was created
    const buyer = await prisma.buyer.findFirst({
      where: { platformUserId, platform: 'TELEGRAM' },
    });
    expect(buyer).toBeDefined();
    expect(buyer?.inquiriesUsedThisMonth).toBe(1);
  });

  test('should enforce inquiry limit (2 per month)', async () => {
    const platformUserId = `${TEST_PREFIX}${Date.now()}_2`;

    // Create buyer with 2 inquiries already used
    await prisma.buyer.create({
      data: {
        platform: 'TELEGRAM',
        platformUserId,
        platformChatId: platformUserId,
        platformUserName: `${TEST_PREFIX}LimitTest`,
        inquiriesUsedThisMonth: 2,
        inquiryLimitResetAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'TELEGRAM',
        platformUserId,
        platformChatId: platformUserId,
        name: `${TEST_PREFIX}LimitTest`,
        phone: '79001234567',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Механика',
        color: 'Белый',
        consent: true,
      }),
    });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain('Лимит');
  });

  test('should reject missing required fields', async () => {
    const res = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'TELEGRAM',
        // Missing platformUserId, name, phone, model, etc.
      }),
    });

    expect(res.status).toBe(400);
  });

  test('should reject without consent', async () => {
    const platformUserId = `${TEST_PREFIX}${Date.now()}_3`;

    const res = await fetch(`${BASE_URL}/api/inquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'TELEGRAM',
        platformUserId,
        name: `${TEST_PREFIX}NoConsent`,
        phone: '79001234567',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Механика',
        color: 'Белый',
        consent: false,
      }),
    });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/inquiries/[id]', () => {
  test('should fetch inquiry by ID with offers', async () => {
    const platformUserId = `${TEST_PREFIX}${Date.now()}_fetch`;

    // Create buyer and inquiry
    const buyer = await prisma.buyer.create({
      data: {
        platform: 'TELEGRAM',
        platformUserId,
        platformChatId: platformUserId,
      },
    });

    const inquiry = await prisma.inquiry.create({
      data: {
        buyerId: buyer.id,
        name: `${TEST_PREFIX}FetchTest`,
        phone: '79001234567',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Механика',
        color: 'Белый',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const res = await fetch(
      `${BASE_URL}/api/inquiries/${inquiry.id}?platformUserId=${platformUserId}`
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(inquiry.id);
    expect(data.name).toBe(`${TEST_PREFIX}FetchTest`);
    expect(data).toHaveProperty('offers');
  });

  test('should return 404 for non-existent inquiry', async () => {
    const res = await fetch(`${BASE_URL}/api/inquiries/non-existent-id?platformUserId=test`);
    expect(res.status).toBe(404);
  });

  test('should return 410 for expired inquiry', async () => {
    const platformUserId = `${TEST_PREFIX}${Date.now()}_expired`;

    const buyer = await prisma.buyer.create({
      data: {
        platform: 'TELEGRAM',
        platformUserId,
        platformChatId: platformUserId,
      },
    });

    const inquiry = await prisma.inquiry.create({
      data: {
        buyerId: buyer.id,
        name: `${TEST_PREFIX}Expired`,
        phone: '79001234567',
        model: 'Granta',
        submodel: 'sedan',
        transmission: 'Механика',
        color: 'Белый',
        expiresAt: new Date(Date.now() - 1000), // Already expired
      },
    });

    const res = await fetch(
      `${BASE_URL}/api/inquiries/${inquiry.id}?platformUserId=${platformUserId}`
    );
    expect(res.status).toBe(410);
  });
});
