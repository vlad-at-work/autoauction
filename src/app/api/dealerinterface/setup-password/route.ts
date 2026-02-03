import { NextRequest, NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { hashPassword, createSessionToken } from '@/lib/auth/dealer-auth';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';

/**
 * Set password for a dealer (first-time setup)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate WebApp initData
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const { platform, userId: platformUserId, chatId } = validation;

    if (!platform || !platformUserId) {
      return NextResponse.json({ error: 'Missing platform or user ID' }, { status: 400 });
    }

    const body = await request.json();
    const { dealerId, password } = body;

    if (!dealerId || !password) {
      return NextResponse.json({ error: 'Missing dealerId or password' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const prismaPlat = platform.toUpperCase() as Platform;

    // Verify the dealer exists and belongs to this platform user
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
    });

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // Verify platform ownership
    if (dealer.platform !== prismaPlat || dealer.platformUserId !== platformUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if password is already set
    if (dealer.passwordHash) {
      return NextResponse.json({ error: 'Password already set' }, { status: 400 });
    }

    // Hash and save password
    const passwordHash = await hashPassword(password);

    await prisma.dealer.update({
      where: { id: dealerId },
      data: {
        passwordHash,
        platformChatId: chatId || platformUserId, // Update chat ID if available
      },
    });

    // Create session token
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
    console.error('[/api/dealerinterface/setup-password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
