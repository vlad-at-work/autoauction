import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding cascade deletes to foreign keys...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Inquiry" DROP CONSTRAINT "Inquiry_buyerId_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_buyerId_fkey"
    FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Offer" DROP CONSTRAINT "Offer_inquiryId_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Offer" ADD CONSTRAINT "Offer_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Offer" DROP CONSTRAINT "Offer_dealerId_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Offer" ADD CONSTRAINT "Offer_dealerId_fkey"
    FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_offerId_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_offerId_fkey"
    FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_inquiryId_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_inquiryId_fkey"
    FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_dealerId_fkey";
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_dealerId_fkey"
    FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE;
  `);

  console.log('✅ Cascade deletes added successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
