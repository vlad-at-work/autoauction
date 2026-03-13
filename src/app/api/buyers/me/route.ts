import { NextResponse } from 'next/server';

import { INTERNAL_ERROR_MESSAGE } from '@/lib/errors';

import { prisma } from '@/lib/db';
import { validateWebAppRequest, isPlatformUserDealer } from '@/lib/auth/webapp-validation';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const log = logger.child({ route: 'buyers/me' });

export const GET = withLogging('buyers/me', async (request: Request) => {
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

    // DEBUG: Log the query parameters
    log.info(
      {
        platformEnum,
        validationUserId: validation.userId,
        platformUserIdParam,
        queryPlatform: platformParam,
      },
      '[buyers/me] Querying buyer with params'
    );

    // Mutual exclusivity check: dealers cannot be buyers
    const isDealer = await isPlatformUserDealer(platformEnum, validation.userId);
    if (isDealer) {
      return NextResponse.json(
        { error: 'Этот аккаунт зарегистрирован как дилер', isDealer: true },
        { status: 403 }
      );
    }

    // First, check if ANY buyer exists with this platformUserId (regardless of platform)
    const anyBuyerWithUserId = await prisma.buyer.findFirst({
      where: { platformUserId: validation.userId },
      select: { id: true, platform: true, phone: true, phoneVerified: true, deletedAt: true },
    });
    log.info(
      { anyBuyerWithUserId },
      '[buyers/me] Check for buyer with same platformUserId across platforms'
    );

    const buyer = await prisma.buyer.findFirst({
      where: { platform: platformEnum, platformUserId: validation.userId, deletedAt: null },
      select: {
        id: true,
        phone: true,
        phoneVerified: true,
      },
    });

    log.info({ buyerFound: !!buyer, buyer }, '[buyers/me] Buyer query result');

    if (!buyer) {
      return NextResponse.json({ error: 'Покупатель не найден' }, { status: 404 });
    }

    return NextResponse.json(buyer);
  } catch (error) {
    captureError(error, { route: 'buyers/me', method: 'GET' });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : INTERNAL_ERROR_MESSAGE,
      },
      { status: 500 }
    );
  }
});

export const POST = withLogging('buyers/me', async (request: Request) => {
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
      platformHandle?: string;
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
        platformHandle: body.platformHandle,
        deletedAt: null,
      },
      create: {
        platform: platformEnum,
        platformUserId: validation.userId,
        platformUserName: body.platformUserName,
        platformHandle: body.platformHandle,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    return NextResponse.json(buyer);
  } catch (error) {
    captureError(error, { route: 'buyers/me', method: 'POST' });
    log.error({ err: error }, 'create buyer error');
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : INTERNAL_ERROR_MESSAGE,
      },
      { status: 500 }
    );
  }
});
