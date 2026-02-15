/**
 * Dealer Visibility Tests
 *
 * Tests that competing dealers CANNOT see buyer contact info for winning offers
 * Only the winning dealer should see buyer name, email, phone
 */

import { beforeAll, afterAll, describe, expect, it } from 'bun:test';
import { config } from 'dotenv';
import { prisma } from '@/lib/db';

// Load environment variables before tests
config({ path: '.env.local' });

const TEST_PREFIX = 'test_visibility_';

describe('Dealer Transaction Visibility', () => {
  let buyerId: string;
  let inquiryId: string;
  let dealer1Id: string;
  let dealer2Id: string;
  let offer1Id: string;
  let transactionId: string;

  beforeAll(async () => {
    // Cleanup previous test data
    await prisma.transaction.deleteMany({
      where: { inquiry: { buyer: { platformUserId: { startsWith: TEST_PREFIX } } } },
    });
    await prisma.offer.deleteMany({
      where: { inquiry: { buyer: { platformUserId: { startsWith: TEST_PREFIX } } } },
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

    // Create test buyer
    const buyer = await prisma.buyer.create({
      data: {
        platform: 'TELEGRAM',
        platformUserId: `${TEST_PREFIX}buyer_1`,
        platformChatId: `${TEST_PREFIX}chat_1`,
      },
    });
    buyerId = buyer.id;

    // Create test inquiry
    const inquiry = await prisma.inquiry.create({
      data: {
        buyerId,
        name: 'Test Buyer',
        email: 'buyer@test.com',
        phone: '+79991234567',
        model: 'Test Model',
        submodel: 'Test Submodel',
        transmission: 'Автомат',
        color: 'Белый',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    inquiryId = inquiry.id;

    // Create two dealers
    const dealer1 = await prisma.dealer.create({
      data: { username: `${TEST_PREFIX}dealer1`, name: 'Dealer One' },
    });
    dealer1Id = dealer1.id;

    const dealer2 = await prisma.dealer.create({
      data: { username: `${TEST_PREFIX}dealer2`, name: 'Dealer Two' },
    });
    dealer2Id = dealer2.id;

    // Both dealers submit offers
    const offer1 = await prisma.offer.create({
      data: {
        inquiryId,
        dealerId: dealer1Id,
        price: 5000000,
        confirmedMatch: true,
        additionalComments: 'Offer from dealer 1',
      },
    });
    offer1Id = offer1.id;

    await prisma.offer.create({
      data: {
        inquiryId,
        dealerId: dealer2Id,
        price: 5500000,
        confirmedMatch: true,
        additionalComments: 'Offer from dealer 2',
      },
    });

    // Buyer accepts dealer1's offer
    const transaction = await prisma.transaction.create({
      data: {
        inquiryId,
        offerId: offer1Id,
        dealerId: dealer1Id,
        buyerName: 'Secret Buyer Name',
        buyerEmail: 'secret@email.com',
        buyerPhone: '+79999999999',
      },
    });
    transactionId = transaction.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.transaction.deleteMany({
      where: { inquiry: { buyer: { platformUserId: { startsWith: TEST_PREFIX } } } },
    });
    await prisma.offer.deleteMany({
      where: { inquiry: { buyer: { platformUserId: { startsWith: TEST_PREFIX } } } },
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

  it('should show transaction exists for all dealers', async () => {
    // Both dealers should be able to see that offer1 has a transaction
    const offer = await prisma.offer.findUnique({
      where: { id: offer1Id },
      include: { transaction: { select: { id: true, acceptedAt: true } } },
    });

    expect(offer).not.toBeNull();
    expect(offer!.transaction).not.toBeNull();
    expect(offer!.transaction!.id).toBe(transactionId);
  });

  it('winning dealer should see buyer contact info', async () => {
    // Dealer 1 queries their own transaction
    const transaction = await prisma.transaction.findFirst({
      where: { dealerId: dealer1Id, inquiryId },
      select: {
        id: true,
        buyerName: true,
        buyerEmail: true,
        buyerPhone: true,
      },
    });

    expect(transaction).not.toBeNull();
    expect(transaction!.buyerName).toBe('Secret Buyer Name');
    expect(transaction!.buyerEmail).toBe('secret@email.com');
    expect(transaction!.buyerPhone).toBe('+79999999999');
  });

  it('competing dealer should NOT have transaction for this inquiry', async () => {
    // Dealer 2 should not have a transaction
    const transaction = await prisma.transaction.findFirst({
      where: { dealerId: dealer2Id, inquiryId },
    });

    expect(transaction).toBeNull();
  });

  it('competing dealer query should return empty when filtering by their ID', async () => {
    // This simulates the query pattern used in the dealer inquiry page
    // where transactions are filtered by the current dealer's ID
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        transactions: {
          where: { dealerId: dealer2Id },
          select: {
            id: true,
            buyerName: true,
            buyerEmail: true,
            buyerPhone: true,
          },
        },
      },
    });

    expect(inquiry).not.toBeNull();
    expect(inquiry!.transactions).toHaveLength(0);
  });

  it('total transaction count should still be visible to all', async () => {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    expect(inquiry).not.toBeNull();
    expect(inquiry!._count.transactions).toBe(1);
  });
});
