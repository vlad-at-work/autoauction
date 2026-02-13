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

    console.warn('[/api/dealerinterface/check] Request:', {
      platform,
      platformUserId,
      chatId,
      startParamRaw,
      startParam,
      bodyKeys: body ? Object.keys(body) : null,
    });

    // Check if this platform user is already a buyer (mutual exclusivity)
    const isBuyer = await isPlatformUserBuyer(prismaPlat, platformUserId);
    if (isBuyer) {
      return NextResponse.json({ blocked: true });
    }

    // Invite link claiming: startapp="claim_<dealerId>_<token>"
    // IMPORTANT: Process claim BEFORE checking existing session, so users can claim new dealers
    console.warn('[/api/dealerinterface/check] Claim check:', {
      hasStartParam: !!startParam,
      startsWithClaim: startParam?.startsWith('claim_'),
    });
    if (startParam?.startsWith('claim_')) {
      console.warn('[/api/dealerinterface/check] Processing claim:', { startParam });
      const parts = startParam.split('_');
      if (parts.length < 3) {
        console.warn(
          '[/api/dealerinterface/check] Invalid claim format - not enough parts:',
          parts.length
        );
        return NextResponse.json({ error: 'Invalid claim link format' }, { status: 400 });
      }
      const dealerId = parts[1];
      const token = parts.slice(2).join('_'); // Token may contain underscores
      console.warn('[/api/dealerinterface/check] Claim parts:', {
        dealerId,
        tokenLength: token.length,
      });
      if (!dealerId || !token) {
        return NextResponse.json({ error: 'Invalid claim link' }, { status: 400 });
      }

      const payload = validateDealerClaimToken(token);
      console.warn('[/api/dealerinterface/check] Claim validation:', {
        payload,
        dealerIdMatch: payload?.dealerId === dealerId,
      });
      if (!payload || payload.dealerId !== dealerId) {
        return NextResponse.json({ error: 'Claim link expired or invalid' }, { status: 400 });
      }

      const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: {
          id: true,
          name: true,
          active: true,
          platform: true,
          platformUserId: true,
          passwordHash: true,
        },
      });

      if (!dealer) {
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }

      if (!dealer.active) {
        return NextResponse.json({ error: 'Dealer is inactive' }, { status: 403 });
      }

      // Check if dealer already claimed by someone else
      if (dealer.platform && dealer.platformUserId) {
        if (dealer.platform !== prismaPlat || dealer.platformUserId !== platformUserId) {
          return NextResponse.json({ error: 'Dealer already claimed' }, { status: 409 });
        }
        // Already claimed by this user - continue to setup or authenticated
      }

      // Check if this platform user already bound to a DIFFERENT dealer
      const existingDealerForUser = await findDealerByPlatformUserId(prismaPlat, platformUserId);
      if (existingDealerForUser && existingDealerForUser.id !== dealerId) {
        return NextResponse.json({ error: 'Account already bound to a dealer' }, { status: 409 });
      }

      // Bind dealer to this platform user
      await prisma.dealer.update({
        where: { id: dealerId },
        data: {
          platform: prismaPlat,
          platformUserId: platformUserId,
          platformChatId: chatId ?? platformUserId,
        },
      });

      console.warn(`[check] Dealer ${dealerId} claimed by ${platform}:${platformUserId}`);

      // Clear any existing session cookie so new dealer can be set up
      const response = NextResponse.json({ status: 'needs_setup', dealerId });
      response.cookies.set('dealer_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      console.warn('[/api/dealerinterface/check] Returning: needs_setup (claim), cleared session');
      return response;
    }

    // Check for existing session token in cookie
    const sessionToken = request.cookies.get('dealer_session')?.value;
    console.warn('[/api/dealerinterface/check] Session check:', {
      hasSessionToken: !!sessionToken,
    });
    if (sessionToken) {
      const session = validateSessionToken(sessionToken);
      console.warn('[/api/dealerinterface/check] Session validation:', {
        hasSession: !!session,
        sessionPlatform: session?.platform,
        sessionUserId: session?.platformUserId,
        matches: session?.platform === prismaPlat && session?.platformUserId === platformUserId,
      });
      if (session && session.platform === prismaPlat && session.platformUserId === platformUserId) {
        // Verify the dealer still exists (may have been deleted in DB wipe)
        const dealer = await prisma.dealer.findUnique({
          where: { id: session.dealerId },
          select: { id: true, active: true },
        });
        if (dealer && dealer.active) {
          // Valid session and dealer exists
          console.warn('[/api/dealerinterface/check] Returning: authenticated');
          return NextResponse.json({ status: 'authenticated' });
        }
        // Dealer not found or inactive - log and continue to claim flow
        console.warn(
          '[/api/dealerinterface/check] Session dealer not found/inactive, continuing to claim check'
        );
      }
      // Session invalid or dealer gone - continue to claim check below
      // The old cookie will be overwritten when new dealer is claimed
    }

    // Check if dealer exists with this platform
    const existingDealer = await findDealerByPlatformUserId(prismaPlat, platformUserId);
    console.warn('[/api/dealerinterface/check] Existing dealer check:', {
      hasExisting: !!existingDealer,
      hasPassword: !!existingDealer?.passwordHash,
    });

    if (existingDealer) {
      if (existingDealer.passwordHash) {
        // Dealer has password set, needs to login
        console.warn('[/api/dealerinterface/check] Returning: needs_password');
        return NextResponse.json({ status: 'needs_password' });
      } else {
        // Dealer claimed platform but hasn't set password (edge case)
        console.warn('[/api/dealerinterface/check] Returning: needs_setup (existing)');
        return NextResponse.json({ status: 'needs_setup', dealerId: existingDealer.id });
      }
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
      select: {
        id: true,
        name: true,
      },
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

      // Note: Welcome message is sent by webhook when user clicks bot link, not here
      // (bot can't message users who haven't started a chat)
      console.warn('[/api/dealerinterface/check] Returning: needs_setup (auto-claim)');
      return NextResponse.json({ status: 'needs_setup', dealerId: unclaimedDealers[0].id });
    }

    if (unclaimedDealers.length > 1) {
      console.warn('[/api/dealerinterface/check] Returning: needs_invite');
      return NextResponse.json({ status: 'needs_invite' });
    }

    // No dealer account available
    console.warn('[/api/dealerinterface/check] Returning: not_dealer');
    return NextResponse.json({ status: 'not_dealer' });
  } catch (error) {
    console.error('[/api/dealerinterface/check] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Send welcome message to dealer via MAX
 * This establishes the chat in the user's chat list
 */
// Note: Welcome messages are sent by the webhook handler when user clicks /start
// The API cannot send messages to users who haven't started a chat with the bot
