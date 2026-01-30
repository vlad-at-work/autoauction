import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * CAUTION: This endpoint completely clears all data from the database.
 * Use only for development/testing. Add proper auth in production.
 */
export async function POST(_request: Request) {
  try {
    // Delete in order of dependencies
    await prisma.lead.deleteMany({});
    await prisma.offer.deleteMany({});
    await prisma.inquiry.deleteMany({});
    await prisma.buyer.deleteMany({});
    await prisma.dealer.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'Database cleared successfully',
    });
  } catch (err) {
    console.error('Clear DB error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
