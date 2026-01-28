import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const result = await prisma.buyer.deleteMany({
      where: {
        platformUserId: {
          startsWith: 'debug_',
        },
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error('Debug clear error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to clear debug data' },
      { status: 500 }
    );
  }
}
