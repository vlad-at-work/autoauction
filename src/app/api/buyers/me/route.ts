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
      return NextResponse.json({ error: 'Покупатель не найден' }, { status: 404 });
    }

    return NextResponse.json(buyer);
  } catch (error) {
    console.error('Get buyer error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      platform: string;
      platformUserId: string;
      platformUserName?: string;
    };

    const { platform, platformUserId, platformUserName } = body;

    if (!platformUserId || !platform) {
      return NextResponse.json(
        { error: 'Отсутствует platformUserId или platform' },
        { status: 400 }
      );
    }

    const platformEnum = platform === 'max' ? 'MAX' : 'TELEGRAM';

    const buyer = await prisma.buyer.upsert({
      where: {
        platform_platformUserId: {
          platform: platformEnum,
          platformUserId,
        },
      },
      update: {
        platformUserName,
      },
      create: {
        platform: platformEnum,
        platformUserId,
        platformUserName,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json(buyer);
  } catch (error) {
    console.error('Create buyer error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
