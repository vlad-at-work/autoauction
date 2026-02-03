import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log('Nuking DB...');
  await prisma.passwordResetCode.deleteMany({});
  await prisma.transaction.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.inquiry.deleteMany({});
  await prisma.buyer.deleteMany({});
  await prisma.dealer.deleteMany({});
  // eslint-disable-next-line no-console
  console.log('DB cleared');

  const buyers = await prisma.buyer.count();
  const inquiries = await prisma.inquiry.count();
  const offers = await prisma.offer.count();
  const transactions = await prisma.transaction.count();
  const dealers = await prisma.dealer.count();
  const resetCodes = await prisma.passwordResetCode.count();
  // eslint-disable-next-line no-console
  console.log('Remaining:', { buyers, inquiries, offers, transactions, dealers, resetCodes });
}

main().finally(() => prisma.$disconnect());
