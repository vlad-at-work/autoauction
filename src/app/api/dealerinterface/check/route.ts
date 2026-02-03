import { NextRequest, NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import {
  findDealerByPlatformUserId,
  isPlatformUserBuyer,
  validateSessionToken,
} from '@/lib/auth/dealer-auth';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';

/**
 * Check dealer status for mini-app authentication flow
 *
 * Returns one of:
 * - { status: 'authenticated' } - dealer is logged in with valid session
 * - { status: 'needs_password' } - dealer exists and has password, needs to login
 * - { status: 'needs_setup', dealerId } - dealer exists but needs to set password (first login)
 * - { status: 'not_dealer' } - platform user is not a registered dealer
 * - { blocked: true } - platform user is already a buyer
 */
export async function POST(request: NextRequest) {
  try {
    // Validate WebApp initData with dealer bot token
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      console.error('[/api/dealerinterface/check] Invalid WebApp data:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const { platform, userId: platformUserId, chatId } = validation;

    if (!platform || !platformUserId) {
      return NextResponse.json({ error: 'Missing platform or user ID' }, { status: 400 });
    }

    const prismaPlat = platform.toUpperCase() as Platform;

    // Check if this platform user is already a buyer (mutual exclusivity)
    const isBuyer = await isPlatformUserBuyer(prismaPlat, platformUserId);
    if (isBuyer) {
      return NextResponse.json({ blocked: true });
    }

    // Check for existing session token in cookie
    const sessionToken = request.cookies.get('dealer_session')?.value;
    if (sessionToken) {
      const session = validateSessionToken(sessionToken);
      if (session && session.platform === prismaPlat && session.platformUserId === platformUserId) {
        // Valid session - dealer is authenticated
        return NextResponse.json({ status: 'authenticated' });
      }
    }

    // Check if dealer exists with this platform
    const existingDealer = await findDealerByPlatformUserId(prismaPlat, platformUserId);

    if (existingDealer) {
      if (existingDealer.passwordHash) {
        // Dealer has password set, needs to login
        return NextResponse.json({ status: 'needs_password' });
      } else {
        // Dealer claimed platform but hasn't set password (edge case)
        return NextResponse.json({ status: 'needs_setup', dealerId: existingDealer.id });
      }
    }

    // Check for unclaimed dealer accounts (admin created, waiting for platform association)
    // For now, we require admin to create dealers with platform info
    // Future: could allow dealers to claim by username

    // Look for any dealer without platform that could be claimed
    // This is a simplified approach - in production you might want username-based claiming
    const unclaimedDealer = await prisma.dealer.findFirst({
      where: {
        platform: null,
        platformUserId: null,
        deletedAt: null,
        active: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (unclaimedDealer) {
      // Allow this platform user to claim this dealer account
      // Update dealer with platform info (password will be set in setup)
      await prisma.dealer.update({
        where: { id: unclaimedDealer.id },
        data: {
          platform: prismaPlat,
          platformUserId,
          platformChatId: chatId || platformUserId,
        },
      });

      return NextResponse.json({ status: 'needs_setup', dealerId: unclaimedDealer.id });
    }

    // No dealer account available
    return NextResponse.json({ status: 'not_dealer' });
  } catch (error) {
    console.error('[/api/dealerinterface/check] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
