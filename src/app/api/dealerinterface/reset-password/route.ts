import { NextRequest, NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import {
  findDealerByPlatformUserId,
  applyResetCodeAndSetPassword,
  createSessionToken,
} from '@/lib/auth/dealer-auth';
import { Platform } from '@prisma/client';

/**
 * Reset dealer password using a code
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { code, password } = body;

    if (!code || !password) {
      return NextResponse.json({ error: 'Missing code or password' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const prismaPlat = platform.toUpperCase() as Platform;

    // Find dealer by platform
    const dealer = await findDealerByPlatformUserId(prismaPlat, platformUserId);

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // Validate code and set new password
    const result = await applyResetCodeAndSetPassword(dealer.id, code, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Invalid code' }, { status: 400 });
    }

    // Create new session token
    const sessionToken = createSessionToken({
      id: dealer.id,
      platform: prismaPlat,
      platformUserId,
    });

    // Set session cookie
    const response = NextResponse.json({ success: true });
    response.cookies.set('dealer_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[/api/dealerinterface/reset-password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
