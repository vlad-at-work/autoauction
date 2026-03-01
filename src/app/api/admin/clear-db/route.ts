import { NextResponse } from 'next/server';

import { INTERNAL_ERROR_MESSAGE } from '@/lib/errors';

import { prisma } from '@/lib/db';
import { logger, withLogging } from '@/lib/logger';

const log = logger.child({ route: 'admin/clear-db' });

/**
 * Admin-only: completely clears all data from the database.
 * Protected by Basic Auth in middleware for /api/admin/*.
 */
export const POST = withLogging('admin/clear-db', async (_request: Request) => {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({});
      await tx.offer.deleteMany({});
      await tx.inquiry.deleteMany({});
      await tx.buyer.deleteMany({});
      await tx.dealer.deleteMany({});
    });

    log.warn('database cleared');

    return NextResponse.json({
      success: true,
      message: 'База данных очищена',
    });
  } catch (err) {
    log.error({ err }, 'clear DB error');
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : INTERNAL_ERROR_MESSAGE,
      },
      { status: 500 }
    );
  }
});
