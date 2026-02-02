import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';

export async function GET(request: Request) {
  const startTime = Date.now();
  console.log('[API /api/buyers/me GET] Request started');

  try {
    const { searchParams } = new URL(request.url);
    const platformUserId = searchParams.get('platformUserId');
    const platform = searchParams.get('platform');
    const authHeader = request.headers.get('authorization');

    console.log('[API /api/buyers/me GET] Params:', {
      platformUserId,
      platform,
      hasAuthHeader: !!authHeader,
    });

    if (!platformUserId || !platform) {
      console.log('[API /api/buyers/me GET] Missing required params');
      return NextResponse.json(
        { error: 'Отсутствует platformUserId или platform' },
        { status: 400 }
      );
    }

    // Validate WebApp request if Authorization header is present
    // This ensures the request is actually coming from Telegram/MAX WebView
    if (authHeader) {
      console.log('[API /api/buyers/me GET] Validating auth header...');
      const validation = validateWebAppRequest(authHeader);
      console.log('[API /api/buyers/me GET] Validation result:', {
        valid: validation.valid,
        error: validation.error,
        userId: validation.userId,
      });

      if (!validation.valid) {
        console.error('[API /api/buyers/me GET] Auth validation failed:', validation.error);
        Sentry.captureMessage('WebApp auth validation failed', {
          level: 'warning',
          tags: {
            context: 'auth_validation',
            platform: platform || 'unknown',
          },
          extra: {
            error: validation.error,
            platformUserId,
          },
        });
        return NextResponse.json(
          { error: 'Неавторизованно: ' + validation.error },
          { status: 401 }
        );
      }
      // Verify the user ID matches what was sent
      if (validation.userId !== platformUserId) {
        console.error('[API /api/buyers/me GET] User ID mismatch:', {
          expected: platformUserId,
          got: validation.userId,
        });
        Sentry.captureMessage('User ID mismatch in auth validation', {
          level: 'error',
          tags: {
            context: 'auth_validation',
            platform: platform || 'unknown',
          },
          extra: {
            expected: platformUserId,
            got: validation.userId,
          },
        });
        return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 });
      }
    }

    const platformEnum = platform === 'max' ? 'MAX' : 'TELEGRAM';
    console.log('[API /api/buyers/me GET] Querying database for buyer...', {
      platformEnum,
      platformUserId,
    });

    const buyer = await prisma.buyer.findFirst({
      where: { platform: platformEnum, platformUserId, deletedAt: null },
      select: {
        id: true,
      },
    });

    console.log('[API /api/buyers/me GET] Query result:', {
      found: !!buyer,
      buyerId: buyer?.id,
      duration: Date.now() - startTime,
    });

    if (!buyer) {
      console.log('[API /api/buyers/me GET] Buyer not found, returning 404');
      return NextResponse.json({ error: 'Покупатель не найден' }, { status: 404 });
    }

    console.log('[API /api/buyers/me GET] Success, returning buyer:', buyer.id);
    return NextResponse.json(buyer);
  } catch (error) {
    console.error('[API /api/buyers/me GET] Error:', error);
    Sentry.captureException(error, {
      tags: {
        context: 'get_buyer',
        endpoint: '/api/buyers/me',
      },
    });
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
