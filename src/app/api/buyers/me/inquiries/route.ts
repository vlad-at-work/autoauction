import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platformUserId = searchParams.get('platformUserId');
    const platform = searchParams.get('platform');

    if (!platformUserId || !platform) {
      return NextResponse.json(
        { error: 'Отсутствует platformUserId или platform' },
        { status: 400 }
      );
    }

    const platformEnum = platform === 'max' ? 'MAX' : 'TELEGRAM';

    const buyer = await prisma.buyer.findUnique({
      where: {
        platform_platformUserId: {
          platform: platformEnum,
          platformUserId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!buyer) {
      // New user with no inquiries yet
      return NextResponse.json([]);
    }

    const inquiries = await prisma.inquiry.findMany({
      where: {
        buyerId: buyer.id,
      },
      include: {
        _count: {
          select: {
            offers: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(inquiries);
  } catch (error) {
    console.error('Get inquiries error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
