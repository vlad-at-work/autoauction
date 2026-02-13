/**
 * Get active inquiries for authenticated dealer
 *
 * Returns list of inquiries with:
 * - Basic inquiry data
 * - Dealer's offers on each inquiry
 * - Dealer's transactions (accepted offers)
 * - Total counts
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      console.error('[/api/dealer/inquiries] Invalid WebApp data:', validation.error);
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
      console.warn('[/api/dealer/inquiries] Dealer not found');
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    if (!dealer.passwordHash) {
      console.warn('[/api/dealer/inquiries] Dealer not set up');
      return NextResponse.json({ error: 'Complete setup first' }, { status: 403 });
    }

    // Get active inquiries (not expired, not deleted)
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
      take: 100, // Limit to recent 100 inquiries
    });

    console.warn(`[/api/dealer/inquiries] Returning ${inquiries.length} inquiries`);

    return NextResponse.json({ inquiries });
  } catch (err) {
    console.error('[/api/dealer/inquiries] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
