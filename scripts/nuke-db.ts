import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Nuking DB...');
  await prisma.lead.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.inquiry.deleteMany({});
  await prisma.buyer.deleteMany({});
  console.log('DB cleared');

  const buyers = await prisma.buyer.count();
  const inquiries = await prisma.inquiry.count();
  const offers = await prisma.offer.count();
  const leads = await prisma.lead.count();
  console.log('Remaining:', { buyers, inquiries, offers, leads });
}

main().finally(() => prisma.$disconnect());
