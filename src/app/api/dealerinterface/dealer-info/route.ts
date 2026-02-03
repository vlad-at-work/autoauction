import { NextRequest, NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';

/**
 * Get dealer info (username, name) for display during setup
 */
export async function GET(request: NextRequest) {
  try {
    // Validate WebApp initData
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const dealerId = request.nextUrl.searchParams.get('dealerId');
    if (!dealerId) {
      return NextResponse.json({ error: 'Missing dealerId' }, { status: 400 });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: { username: true, name: true },
    });

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    return NextResponse.json(dealer);
  } catch (error) {
    console.error('[/api/dealerinterface/dealer-info] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
