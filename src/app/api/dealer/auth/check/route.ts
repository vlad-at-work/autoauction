/**
 * Check dealer auth status
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      console.warn('[CHECK] Auth failed:', validation.error);
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
    console.error('[CHECK] Error:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
