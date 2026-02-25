import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { captureError } from '@/lib/hawk';

const MAX_INQUIRIES_PER_MONTH = 2;

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

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    const buyer = await prisma.buyer.findFirst({
      where: { platform: platformEnum, platformUserId: validation.userId, deletedAt: null },
      select: {
        id: true,
        inquiriesUsedThisMonth: true,
        inquiryLimitResetAt: true,
      },
    });

    if (!buyer) {
      // New user with no inquiries yet
      return NextResponse.json({
        inquiries: [],
        limits: {
          used: 0,
          max: MAX_INQUIRIES_PER_MONTH,
          remaining: MAX_INQUIRIES_PER_MONTH,
          resetsAt: null,
        },
      });
    }

    const inquiries = await prisma.inquiry.findMany({
      where: {
        buyerId: buyer.id,
        deletedAt: null,
      },
      include: {
        offers: {
          where: { deletedAt: null },
          select: { id: true },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
        transactions: {
          select: {
            id: true,
            dealerId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const normalizedInquiries = inquiries.map(({ offers, _count, ...rest }) => ({
      ...rest,
      _count: {
        offers: offers.length,
        transactions: _count.transactions,
      },
    }));

    // Check if limits should be reset
    const now = new Date();
    let remainingInquiries = MAX_INQUIRIES_PER_MONTH - buyer.inquiriesUsedThisMonth;
    let resetsAt: Date | null = buyer.inquiryLimitResetAt;

    if (now >= buyer.inquiryLimitResetAt) {
      // Limits have reset
      remainingInquiries = MAX_INQUIRIES_PER_MONTH;
      resetsAt = null; // Will be set on next inquiry creation
    }

    return NextResponse.json({
      inquiries: normalizedInquiries,
      limits: {
        used: Math.max(0, MAX_INQUIRIES_PER_MONTH - remainingInquiries),
        max: MAX_INQUIRIES_PER_MONTH,
        remaining: remainingInquiries,
        resetsAt: resetsAt?.toISOString() || null,
      },
    });
  } catch (error) {
    captureError(error, { route: 'buyers/me/inquiries' });
    console.error('Get inquiries error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
