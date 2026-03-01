/**
 * Check dealer auth status
 */

import { NextResponse } from 'next/server';

import { INTERNAL_ERROR_MESSAGE } from '@/lib/errors';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const log = logger.child({ route: 'dealer/auth/check' });

export const POST = withLogging('dealer/auth/check', async (request: Request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      log.warn({ error: validation.error }, 'auth failed');
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    const dealer = await prisma.dealer.findFirst({
      where: {
        platform: platformEnum,
        platformUserId: validation.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        active: true,
        passwordHash: true,
      },
    });

    if (!dealer) {
      return NextResponse.json({ status: 'not_found' });
    }

    if (!dealer.active) {
      return NextResponse.json({ error: 'Аккаунт дилера неактивен' }, { status: 403 });
    }

    if (!dealer.passwordHash) {
      return NextResponse.json({
        status: 'needs_setup',
        dealerId: dealer.id,
        dealerName: dealer.name,
      });
    }

    return NextResponse.json({
      status: 'authenticated',
      dealer: {
        id: dealer.id,
        username: dealer.username,
        name: dealer.name,
      },
    });
  } catch (err) {
    captureError(err, { route: 'dealer/auth/check' });
    log.error({ err }, 'error');
    return NextResponse.json({ error: INTERNAL_ERROR_MESSAGE }, { status: 500 });
  }
});
