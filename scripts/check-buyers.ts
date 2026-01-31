import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const buyers = await prisma.buyer.findMany();
  console.log('Buyers:', JSON.stringify(buyers, null, 2));

  const inquiries = await prisma.inquiry.findMany({ include: { buyer: true } });
  console.log('Inquiries:', JSON.stringify(inquiries, null, 2));
}

main().finally(() => prisma.$disconnect());
