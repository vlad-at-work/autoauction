import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { isPlatformUserDealer } from '@/lib/auth/dealer-auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const validation = validateWebAppRequest(authHeader);
    if (!validation.valid || !validation.userId || !validation.platform) {
      return NextResponse.json(
        { error: 'Неавторизованно: ' + (validation.error || 'unknown error') },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const platformUserIdParam = searchParams.get('platformUserId');
    const platformParam = searchParams.get('platform');

    if (platformUserIdParam && platformUserIdParam !== validation.userId) {
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
    }

    if (platformParam && platformParam !== validation.platform) {
      return NextResponse.json({ error: 'Platform mismatch' }, { status: 403 });
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    // Mutual exclusivity check: dealers cannot be buyers
    const isDealer = await isPlatformUserDealer(platformEnum, validation.userId);
    if (isDealer) {
      return NextResponse.json(
        { error: 'Этот аккаунт зарегистрирован как дилер', isDealer: true },
        { status: 403 }
      );
    }

    const buyer = await prisma.buyer.findFirst({
      where: { platform: platformEnum, platformUserId: validation.userId, deletedAt: null },
      select: {
        id: true,
      },
    });

    if (!buyer) {
      return NextResponse.json({ error: 'Покупатель не найден' }, { status: 404 });
    }

    return NextResponse.json(buyer);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const validation = validateWebAppRequest(authHeader);
    if (!validation.valid || !validation.userId || !validation.platform) {
      return NextResponse.json(
        { error: 'Неавторизованно: ' + (validation.error || 'unknown error') },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      platformUserName?: string;
    };
    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    // Mutual exclusivity check: dealers cannot be buyers
    const isDealer = await isPlatformUserDealer(platformEnum, validation.userId);
    if (isDealer) {
      return NextResponse.json(
        { error: 'Этот аккаунт зарегистрирован как дилер', isDealer: true },
        { status: 403 }
      );
    }

    const buyer = await prisma.buyer.upsert({
      where: {
        platform_platformUserId: {
          platform: platformEnum,
          platformUserId: validation.userId,
        },
      },
      update: {
        platformUserName: body.platformUserName,
        deletedAt: null,
      },
      create: {
        platform: platformEnum,
        platformUserId: validation.userId,
        platformUserName: body.platformUserName,
        deletedAt: null,
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
