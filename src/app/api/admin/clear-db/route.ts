import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

/**
 * Admin-only: completely clears all data from the database.
 * Protected by Basic Auth in middleware for /api/admin/*.
 */
export async function POST(_request: Request) {
  try {
    await prisma.$transaction(async (tx) => {
      // Delete in order of dependencies
      await tx.transaction.deleteMany({});
      await tx.offer.deleteMany({});
      await tx.inquiry.deleteMany({});
      await tx.buyer.deleteMany({});
      await tx.dealer.deleteMany({});
    });

    return NextResponse.json({
      success: true,
      message: 'База данных очищена',
    });
  } catch (err) {
    console.error('Admin clear DB error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
