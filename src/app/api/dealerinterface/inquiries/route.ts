import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken } from '@/lib/auth/dealer-auth';
import { prisma } from '@/lib/db';

/**
 * Get inquiries for the authenticated dealer (mini-app)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate session token from cookie
    const sessionToken = request.cookies.get('dealer_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = validateSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Verify dealer exists and is active
    const dealer = await prisma.dealer.findUnique({
      where: { id: session.dealerId },
      select: { id: true, active: true, name: true, username: true },
    });

    if (!dealer || !dealer.active) {
      return NextResponse.json({ error: 'Dealer not found or inactive' }, { status: 403 });
    }

    const now = new Date();

    // Fetch active and previous inquiries
    const [activeInquiries, previousInquiries] = await Promise.all([
      prisma.inquiry.findMany({
        where: { expiresAt: { gt: now }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          model: true,
          submodel: true,
          transmission: true,
          color: true,
          createdAt: true,
          expiresAt: true,
          offers: {
            where: { deletedAt: null },
            select: {
              id: true,
              price: true,
              dealerId: true,
              createdAt: true,
              transaction: { select: { id: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          transactions: {
            select: { id: true, dealerId: true },
          },
        },
      }),
      prisma.inquiry.findMany({
        where: { expiresAt: { lte: now }, deletedAt: null },
        take: 25,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          model: true,
          submodel: true,
          transmission: true,
          color: true,
          createdAt: true,
          expiresAt: true,
          offers: {
            where: { deletedAt: null },
            select: {
              id: true,
              price: true,
              dealerId: true,
              createdAt: true,
              transaction: { select: { id: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          transactions: {
            select: { id: true, dealerId: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      dealer: { id: dealer.id, name: dealer.name, username: dealer.username },
      activeInquiries,
      previousInquiries,
    });
  } catch (error) {
    console.error('[/api/dealerinterface/inquiries] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
