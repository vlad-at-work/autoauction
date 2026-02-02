import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(_request: Request) {
  try {
    console.log('Running cascade delete migration...');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Inquiry" DROP CONSTRAINT IF EXISTS "Inquiry_buyerId_fkey";
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_buyerId_fkey"
      FOREIGN KEY ("buyerId") REFERENCES "Buyer"("id") ON DELETE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Offer" DROP CONSTRAINT IF EXISTS "Offer_inquiryId_fkey";
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Offer" ADD CONSTRAINT "Offer_inquiryId_fkey"
      FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Offer" DROP CONSTRAINT IF EXISTS "Offer_dealerId_fkey";
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

    console.log('Migration complete');

    return NextResponse.json({
      success: true,
      message: 'Каскадное удаление включено',
    });
  } catch (err) {
    console.error('Migration error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
