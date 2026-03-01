/**
 * Validate dealer invite code
 *
 * POST /api/dealer/invite/validate
 * Body: { code: string }
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const log = logger.child({ route: 'dealer/invite/validate' });

export const POST = withLogging('dealer/invite/validate', async (request: Request) => {
  try {
    const body = (await request.json()) as { code?: string };
    const { code } = body;

    if (!code || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ valid: false, error: 'Введите 6-значный код' }, { status: 400 });
    }

    const dealer = await prisma.dealer.findFirst({
      where: {
        inviteToken: code,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        inviteTokenExpiresAt: true,
      },
    });

    if (!dealer) {
      return NextResponse.json({ valid: false, error: 'Код не найден' }, { status: 404 });
    }

    if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
      return NextResponse.json(
        { valid: false, error: 'Срок действия кода истек' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      valid: true,
      dealerName: dealer.name,
    });
  } catch (err) {
    captureError(err, { route: 'dealer/invite/validate' });
    log.error({ err }, 'error');
    return NextResponse.json(
      { valid: false, error: 'Что-то пошло не так. Мы уже работаем над этим.' },
      { status: 500 }
    );
  }
});
