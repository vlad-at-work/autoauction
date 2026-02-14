/**
 * Set dealer password (first-time setup)
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const body = (await request.json()) as { password: string; startParam?: string };
    const { password, startParam } = body;

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Пароль должен быть не менее 8 символов' },
        { status: 400 }
      );
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';
    let dealer;

    if (startParam?.startsWith('setup_')) {
      const parts = startParam.split('_');
      const dealerId = parts[1];
      const token = parts.slice(2).join('_');

      dealer = await prisma.dealer.findFirst({
        where: {
          id: dealerId,
          inviteToken: token,
          deletedAt: null,
        },
      });

      if (!dealer) {
        return NextResponse.json({ error: 'Неверная ссылка приглашения' }, { status: 400 });
      }

      if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
        return NextResponse.json({ error: 'Срок действия ссылки истек' }, { status: 400 });
      }

      if (dealer.platform && dealer.platformUserId && dealer.platformUserId !== validation.userId) {
        return NextResponse.json(
          { error: 'Аккаунт уже привязан к другому пользователю' },
          { status: 409 }
        );
      }

      await prisma.dealer.update({
        where: { id: dealerId },
        data: {
          platform: platformEnum,
          platformUserId: validation.userId,
          platformChatId: validation.userId,
          inviteToken: null,
          inviteTokenExpiresAt: null,
        },
      });

      console.warn('[SETUP] Dealer claimed:', dealerId, 'by user:', validation.userId);
    } else {
      dealer = await prisma.dealer.findFirst({
        where: {
          platform: platformEnum,
          platformUserId: validation.userId,
          deletedAt: null,
        },
      });

      if (!dealer) {
        return NextResponse.json({ error: 'Дилер не найден' }, { status: 404 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.dealer.update({
      where: { id: dealer.id },
      data: { passwordHash },
    });

    return NextResponse.json({ ok: true, dealerId: dealer.id });
  } catch (err) {
    console.error('[SETUP] Error:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
