import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken } from '@/lib/auth/dealer-auth';
import { prisma } from '@/lib/db';

/**
 * Get inquiry detail for the authenticated dealer (mini-app)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

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
      // Clear invalid session cookie and return 401 to force re-auth
      const response = NextResponse.json(
        { error: 'Dealer not found or inactive' },
        { status: 401 }
      );
      response.cookies.set('dealer_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

    const inquiry = await prisma.inquiry.findFirst({
      where: { id, deletedAt: null },
      include: {
        offers: {
          orderBy: { createdAt: 'desc' },
          where: { deletedAt: null },
          select: {
            id: true,
            price: true,
            comment: true,
            dealerId: true,
            createdAt: true,
            transaction: {
              select: {
                id: true,
                acceptedAt: true,
              },
            },
          },
        },
        transactions: {
          where: { dealerId: dealer.id },
          select: {
            id: true,
            dealerId: true,
            buyerName: true,
            buyerEmail: true,
            buyerPhone: true,
            acceptedAt: true,
          },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    return NextResponse.json({
      dealer: { id: dealer.id, name: dealer.name, username: dealer.username },
      inquiry,
    });
  } catch (error) {
    console.error('[/api/dealerinterface/inquiry/[id]] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
