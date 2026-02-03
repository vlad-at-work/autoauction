import { NextRequest, NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { findDealerByPlatformUserId } from '@/lib/auth/dealer-auth';
import { Platform } from '@prisma/client';

/**
 * Get current dealer's info based on platform credentials
 */
export async function GET(request: NextRequest) {
  try {
    // Validate WebApp initData
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const { platform, userId: platformUserId } = validation;

    if (!platform || !platformUserId) {
      return NextResponse.json({ error: 'Missing platform or user ID' }, { status: 400 });
    }

    const prismaPlat = platform.toUpperCase() as Platform;
    const dealer = await findDealerByPlatformUserId(prismaPlat, platformUserId);

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: dealer.id,
      username: dealer.username,
      name: dealer.name,
    });
  } catch (error) {
    console.error('[/api/dealerinterface/my-info] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
