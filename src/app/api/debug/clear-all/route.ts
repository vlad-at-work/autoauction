import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    // Delete in correct order to avoid foreign key constraints
    await prisma.lead.deleteMany({});
    await prisma.offer.deleteMany({});
    await prisma.inquiry.deleteMany({});
    const result = await prisma.buyer.deleteMany({});

    return NextResponse.json({
      deleted: result.count,
      message: `Deleted ${result.count} buyers and all related data`,
    });
  } catch (error) {
    console.error('Error clearing all data:', error);
    return NextResponse.json({ error: 'Failed to clear all data' }, { status: 500 });
  }
}
