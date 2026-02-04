import { NextRequest, NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import {
  findDealerByPlatformUserId,
  isPlatformUserBuyer,
  validateSessionToken,
} from '@/lib/auth/dealer-auth';
import { validateDealerClaimToken } from '@/lib/auth/dealer-claim';
import { prisma } from '@/lib/db';
import { Platform } from '@prisma/client';

/**
 * Check dealer status for mini-app authentication flow
 *
 * Returns one of:
 * - { status: 'authenticated' } - dealer is logged in with valid session
 * - { status: 'needs_password' } - dealer exists and has password, needs to login
 * - { status: 'needs_setup', dealerId } - dealer exists but needs to set password (first login)
 * - { status: 'needs_invite' } - multiple unclaimed dealers exist; admin must share invite link
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

    const body = (await request.json().catch(() => null)) as {
      startParam?: string | null;
    } | null;
    const startParamRaw = body?.startParam ?? null;
    const startParam = (() => {
      if (!startParamRaw || typeof startParamRaw !== 'string') return null;
      try {
        return decodeURIComponent(startParamRaw);
      } catch {
        return startParamRaw;
      }
    })();

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

    // Invite link claiming: startapp="claim:<dealerId>:<token>"
    if (startParam?.startsWith('claim:')) {
      const [, dealerId, token] = startParam.split(':');
      if (!dealerId || !token) {
        return NextResponse.json({ error: 'Invalid claim link' }, { status: 400 });
      }

      const payload = validateDealerClaimToken(token);
      if (!payload || payload.dealerId !== dealerId) {
        return NextResponse.json({ error: 'Claim link expired or invalid' }, { status: 400 });
      }

      const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: {
          id: true,
          active: true,
          deletedAt: true,
          platform: true,
          platformUserId: true,
          passwordHash: true,
        },
      });

      if (!dealer || dealer.deletedAt) {
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }

      if (!dealer.active) {
        return NextResponse.json({ error: 'Dealer is inactive' }, { status: 403 });
      }

      if (dealer.platform || dealer.platformUserId) {
        return NextResponse.json({ error: 'Dealer already claimed' }, { status: 409 });
      }

      try {
        await prisma.dealer.update({
          where: { id: dealerId },
          data: {
            platform: prismaPlat,
            platformUserId,
            platformChatId: chatId || platformUserId,
          },
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error &&
          'code' in error &&
          (error as { code?: string }).code === 'P2002'
        ) {
          return NextResponse.json({ error: 'Account already bound to a dealer' }, { status: 409 });
        }
        throw error;
      }

      return NextResponse.json({ status: 'needs_setup', dealerId });
    }

    // Fallback: allow auto-claim only when there is exactly ONE unclaimed dealer
    const unclaimedDealers = await prisma.dealer.findMany({
      where: {
        platform: null,
        platformUserId: null,
        deletedAt: null,
        active: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 2, // detect "more than 1"
      select: { id: true },
    });

    if (unclaimedDealers.length === 1) {
      await prisma.dealer.update({
        where: { id: unclaimedDealers[0].id },
        data: {
          platform: prismaPlat,
          platformUserId,
          platformChatId: chatId || platformUserId,
        },
      });

      return NextResponse.json({ status: 'needs_setup', dealerId: unclaimedDealers[0].id });
    }

    if (unclaimedDealers.length > 1) {
      return NextResponse.json({ status: 'needs_invite' });
    }

    // No dealer account available
    return NextResponse.json({ status: 'not_dealer' });
  } catch (error) {
    console.error('[/api/dealerinterface/check] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
