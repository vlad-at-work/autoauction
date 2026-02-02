import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platformUserId = searchParams.get('platformUserId');
    const platform = searchParams.get('platform');
    const authHeader = request.headers.get('authorization');

    if (!platformUserId || !platform) {
      return NextResponse.json(
        { error: 'Отсутствует platformUserId или platform' },
        { status: 400 }
      );
    }

    // Validate WebApp request if Authorization header is present
    // This ensures the request is actually coming from Telegram/MAX WebView
    if (authHeader) {
      const validation = validateWebAppRequest(authHeader);
      if (!validation.valid) {
        return NextResponse.json(
          { error: 'Неавторизованно: ' + validation.error },
          { status: 401 }
        );
      }
      // Verify the user ID matches what was sent
      if (validation.userId !== platformUserId) {
        return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
      }
    }

    const platformEnum = platform === 'max' ? 'MAX' : 'TELEGRAM';

    const buyer = await prisma.buyer.findFirst({
      where: { platform: platformEnum, platformUserId, deletedAt: null },
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
        deletedAt: null,
      },
      create: {
        platform: platformEnum,
        platformUserId,
        platformUserName,
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
