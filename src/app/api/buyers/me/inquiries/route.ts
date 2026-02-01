import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

const MAX_INQUIRIES_PER_MONTH = 2;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platformUserId = searchParams.get('platformUserId');
    const platform = searchParams.get('platform');

    if (!platformUserId || !platform) {
      return NextResponse.json(
        { error: 'Отсутствует platformUserId или platform' },
        { status: 400 }
      );
    }

    const platformEnum = platform === 'max' ? 'MAX' : 'TELEGRAM';

    const buyer = await prisma.buyer.findUnique({
      where: {
        platform_platformUserId: {
          platform: platformEnum,
          platformUserId,
        },
      },
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
      },
      include: {
        _count: {
          select: {
            offers: true,
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
      inquiries,
      limits: {
        used: Math.max(0, MAX_INQUIRIES_PER_MONTH - remainingInquiries),
        max: MAX_INQUIRIES_PER_MONTH,
        remaining: remainingInquiries,
        resetsAt: resetsAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('Get inquiries error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
