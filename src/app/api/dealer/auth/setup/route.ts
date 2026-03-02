/**
 * Claim dealer account via invite token (first-time setup)
 */

import { NextResponse } from 'next/server';

import { INTERNAL_ERROR_MESSAGE } from '@/lib/errors';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const log = logger.child({ route: 'dealer/auth/setup' });

export const POST = withLogging('dealer/auth/setup', async (request: Request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const body = (await request.json()) as { startParam: string };
    const { startParam } = body;

    if (!startParam) {
      return NextResponse.json({ error: 'Код приглашения обязателен' }, { status: 400 });
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';
    let token: string;

    if (startParam.startsWith('setup_')) {
      const parts = startParam.split('_');
      token = parts.slice(2).join('_');
    } else if (/^\d{6}$/.test(startParam)) {
      token = startParam;
    } else {
      return NextResponse.json({ error: 'Неверный формат кода' }, { status: 400 });
    }

    const dealer = await prisma.dealer.findFirst({
      where: {
        inviteToken: token,
        deletedAt: null,
      },
    });

    if (!dealer) {
      return NextResponse.json({ error: 'Неверный код приглашения' }, { status: 400 });
    }

    if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
      return NextResponse.json({ error: 'Срок действия кода истек' }, { status: 400 });
    }

    if (dealer.platform && dealer.platformUserId && dealer.platformUserId !== validation.userId) {
      return NextResponse.json(
        { error: 'Аккаунт уже привязан к другому пользователю' },
        { status: 409 }
      );
    }

    await prisma.dealer.update({
      where: { id: dealer.id },
      data: {
        platform: platformEnum,
        platformUserId: validation.userId,
        platformChatId: validation.userId,
        inviteToken: null,
        inviteTokenExpiresAt: null,
      },
    });

    log.info(
      {
        dealerId: dealer.id,
        dealerName: dealer.name,
        userId: validation.userId,
        platform: platformEnum,
        token,
      },
      '[DealerAuth] Dealer claimed via invite token'
    );

    return NextResponse.json({ ok: true, dealerId: dealer.id });
  } catch (err) {
    captureError(err, { route: 'dealer/auth/setup' });
    log.error({ err }, 'error');
    return NextResponse.json({ error: INTERNAL_ERROR_MESSAGE }, { status: 500 });
  }
});
