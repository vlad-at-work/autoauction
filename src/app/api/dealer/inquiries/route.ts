/**
 * Get active inquiries for authenticated dealer
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    const dealer = await prisma.dealer.findFirst({
      where: {
        platform: platformEnum,
        platformUserId: validation.userId,
        deletedAt: null,
        active: true,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!dealer) {
      return NextResponse.json({ error: 'Дилер не найден' }, { status: 404 });
    }

    if (!dealer.passwordHash) {
      return NextResponse.json({ error: 'Завершите настройку аккаунта' }, { status: 403 });
    }

    const inquiries = await prisma.inquiry.findMany({
      where: {
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        offers: {
          where: {
            dealerId: dealer.id,
            deletedAt: null,
          },
          select: {
            id: true,
            price: true,
            comment: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          where: {
            dealerId: dealer.id,
            deletedAt: null,
          },
          select: {
            id: true,
            buyerName: true,
            buyerEmail: true,
            buyerPhone: true,
            acceptedAt: true,
            offerId: true,
          },
        },
        _count: {
          select: {
            offers: {
              where: { deletedAt: null },
            },
            transactions: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ inquiries });
  } catch (err) {
    console.error('[INQUIRIES] Error:', err);
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 });
  }
}
