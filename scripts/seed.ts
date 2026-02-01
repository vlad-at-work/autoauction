/* eslint-disable no-console */
/**
 * Seed script for creating test data in the database.
 * Run with: bun run db:seed
 */

import { PrismaClient, Platform } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_PREFIX = 'seed_';

async function main() {
  console.log('🌱 Seeding database...\n');

  // Clean existing seed data first
  console.log('Cleaning existing seed data...');
  await cleanSeedData();

  // Create buyers
  console.log('Creating buyers...');
  const buyers = await Promise.all([
    prisma.buyer.create({
      data: {
        platform: Platform.MAX,
        platformUserId: `${SEED_PREFIX}user_1`,
        platformUserName: 'Иван Петров',
        inquiriesUsedThisMonth: 1,
        inquiryLimitResetAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      },
    }),
    prisma.buyer.create({
      data: {
        platform: Platform.MAX,
        platformUserId: `${SEED_PREFIX}user_2`,
        platformUserName: 'Мария Сидорова',
        inquiriesUsedThisMonth: 0,
        inquiryLimitResetAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      },
    }),
    prisma.buyer.create({
      data: {
        platform: Platform.TELEGRAM,
        platformUserId: `${SEED_PREFIX}user_3`,
        platformUserName: 'Алексей Козлов',
        inquiriesUsedThisMonth: 2, // Used all inquiries
        inquiryLimitResetAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      },
    }),
  ]);
  console.log(`  Created ${buyers.length} buyers`);

  // Create dealers
  console.log('Creating dealers...');
  const dealers = await Promise.all([
    prisma.dealer.create({
      data: {
        username: `${SEED_PREFIX}dealer_moscow`,
        name: 'АвтоМосква',
        active: true,
      },
    }),
    prisma.dealer.create({
      data: {
        username: `${SEED_PREFIX}dealer_spb`,
        name: 'Питер-Авто',
        active: true,
      },
    }),
    prisma.dealer.create({
      data: {
        username: `${SEED_PREFIX}dealer_inactive`,
        name: 'Закрытый Дилер',
        active: false,
      },
    }),
  ]);
  console.log(`  Created ${dealers.length} dealers`);

  // Create inquiries with different states
  console.log('Creating inquiries...');
  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const hoursFromNow = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);

  const inquiries = await Promise.all([
    // Active inquiry with offers
    prisma.inquiry.create({
      data: {
        buyerId: buyers[0].id,
        name: 'Иван Петров',
        phone: '+79161234567',
        email: 'ivan@example.com',
        model: 'Vesta',
        submodel: 'SW Cross',
        transmission: 'Автомат',
        color: 'Белый',
        status: 'Поддерживаю российских бойцов в зоне СВО',
        comment: 'Интересует максимальная комплектация',
        createdAt: hoursAgo(6),
        expiresAt: hoursFromNow(18),
      },
    }),
    // Active inquiry without offers
    prisma.inquiry.create({
      data: {
        buyerId: buyers[0].id,
        name: 'Иван Петров',
        phone: '+79161234567',
        model: 'Granta',
        submodel: 'седан',
        transmission: 'Механика',
        color: 'Черный',
        createdAt: hoursAgo(2),
        expiresAt: hoursFromNow(22),
      },
    }),
    // Expired inquiry
    prisma.inquiry.create({
      data: {
        buyerId: buyers[1].id,
        name: 'Мария Сидорова',
        phone: '+79169876543',
        email: 'maria@example.com',
        model: 'Niva Travel',
        submodel: 'Niva Travel',
        transmission: 'Не важно',
        color: 'Серебристый',
        createdAt: hoursAgo(30),
        expiresAt: hoursAgo(6),
      },
    }),
    // Another active inquiry
    prisma.inquiry.create({
      data: {
        buyerId: buyers[2].id,
        name: 'Алексей Козлов',
        phone: '+79165551234',
        model: 'Largus',
        submodel: 'Cross',
        transmission: 'Механика',
        color: 'Синий',
        status: 'Семья участника СВО',
        createdAt: hoursAgo(10),
        expiresAt: hoursFromNow(14),
      },
    }),
  ]);
  console.log(`  Created ${inquiries.length} inquiries`);

  // Create offers - multiple offers per dealer to test new functionality
  console.log('Creating offers...');
  const offers = await Promise.all([
    // Offers for first inquiry - multiple from same dealer
    prisma.offer.create({
      data: {
        inquiryId: inquiries[0].id,
        dealerId: dealers[0].id,
        price: 1480000,
        comment: 'Первоначальное предложение',
        createdAt: hoursAgo(5),
      },
    }),
    prisma.offer.create({
      data: {
        inquiryId: inquiries[0].id,
        dealerId: dealers[0].id,
        price: 1450000,
        comment: 'Обновленная цена! Лучшее предложение в Москве.',
        createdAt: hoursAgo(4),
      },
    }),
    prisma.offer.create({
      data: {
        inquiryId: inquiries[0].id,
        dealerId: dealers[1].id,
        price: 1420000,
        comment: 'Специальное предложение для участников СВО',
        createdAt: hoursAgo(3),
      },
    }),
    // Offer for expired inquiry
    prisma.offer.create({
      data: {
        inquiryId: inquiries[2].id,
        dealerId: dealers[0].id,
        price: 1250000,
        createdAt: hoursAgo(28),
      },
    }),
    // Multiple offers for fourth inquiry
    prisma.offer.create({
      data: {
        inquiryId: inquiries[3].id,
        dealerId: dealers[1].id,
        price: 1180000,
        comment: 'Первое предложение',
        createdAt: hoursAgo(9),
      },
    }),
    prisma.offer.create({
      data: {
        inquiryId: inquiries[3].id,
        dealerId: dealers[1].id,
        price: 1150000,
        comment: 'В наличии, можно забрать сегодня! Снижена цена.',
        createdAt: hoursAgo(8),
      },
    }),
  ]);
  console.log(`  Created ${offers.length} offers`);

  // Create transactions (accepted offers)
  console.log('Creating transactions...');
  const transactions = await Promise.all([
    prisma.transaction.create({
      data: {
        inquiryId: inquiries[2].id,
        offerId: offers[3].id,
        dealerId: dealers[0].id,
        buyerName: 'Мария Сидорова',
        buyerPhone: '+79169876543',
        buyerEmail: 'maria@example.com',
        acceptedAt: hoursAgo(24),
      },
    }),
  ]);
  console.log(`  Created ${transactions.length} transactions`);

  console.log('\n✅ Seed completed!');
  console.log('\nSummary:');
  console.log(`  - Buyers: ${buyers.length}`);
  console.log(`  - Dealers: ${dealers.length}`);
  console.log(`  - Inquiries: ${inquiries.length}`);
  console.log(`  - Offers: ${offers.length}`);
  console.log(`  - Transactions: ${transactions.length}`);
}

async function cleanSeedData() {
  // Delete in reverse order of dependencies
  await prisma.transaction.deleteMany({
    where: {
      offer: {
        inquiry: {
          buyer: {
            platformUserId: { startsWith: SEED_PREFIX },
          },
        },
      },
    },
  });

  await prisma.offer.deleteMany({
    where: {
      OR: [
        {
          inquiry: {
            buyer: {
              platformUserId: { startsWith: SEED_PREFIX },
            },
          },
        },
        {
          dealer: {
            username: { startsWith: SEED_PREFIX },
          },
        },
      ],
    },
  });

  await prisma.inquiry.deleteMany({
    where: {
      buyer: {
        platformUserId: { startsWith: SEED_PREFIX },
      },
    },
  });

  await prisma.buyer.deleteMany({
    where: {
      platformUserId: { startsWith: SEED_PREFIX },
    },
  });

  await prisma.dealer.deleteMany({
    where: {
      username: { startsWith: SEED_PREFIX },
    },
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
