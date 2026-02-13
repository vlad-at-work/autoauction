/**
 * Set dealer password (first-time setup)
 *
 * Body: { password: string, startParam?: string }
 *
 * If startParam is provided (setup_dealerId_token), validates invite token
 * and binds dealer to this platform user. Otherwise expects dealer already bound.
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      console.error('[/api/dealer/auth/setup] Invalid WebApp data:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const body = (await request.json()) as {
      password: string;
      startParam?: string;
    };

    const { password, startParam } = body;

    console.warn('[/api/dealer/auth/setup]', {
      platform: validation.platform,
      userId: validation.userId,
      hasStartParam: !!startParam,
      startParam: startParam?.substring(0, 20),
    });

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';
    let dealer;

    // If startParam provided, validate invite token and claim dealer
    if (startParam?.startsWith('setup_')) {
      const parts = startParam.split('_');
      const dealerId = parts[1];
      const token = parts.slice(2).join('_');

      console.warn('[/api/dealer/auth/setup] Claiming with invite token:', {
        dealerId,
        tokenLength: token.length,
      });

      dealer = await prisma.dealer.findFirst({
        where: {
          id: dealerId,
          inviteToken: token,
          deletedAt: null,
        },
      });

      if (!dealer) {
        console.warn('[/api/dealer/auth/setup] Dealer not found or token invalid');
        return NextResponse.json({ error: 'Invalid invite link' }, { status: 400 });
      }

      if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
        console.warn('[/api/dealer/auth/setup] Invite token expired');
        return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 });
      }

      // Check if dealer already claimed by someone else
      if (dealer.platform && dealer.platformUserId && dealer.platformUserId !== validation.userId) {
        console.warn('[/api/dealer/auth/setup] Dealer already claimed by another user');
        return NextResponse.json({ error: 'This dealer account is already claimed' }, { status: 409 });
      }

      // Bind dealer to this platform user and clear invite token
      console.warn('[/api/dealer/auth/setup] Binding dealer to user');
      await prisma.dealer.update({
        where: { id: dealerId },
        data: {
          platform: platformEnum,
          platformUserId: validation.userId,
          platformChatId: validation.userId, // Store for notifications
          inviteToken: null,
          inviteTokenExpiresAt: null,
        },
      });
    } else {
      // No invite token - find dealer already bound to this user
      dealer = await prisma.dealer.findFirst({
        where: {
          platform: platformEnum,
          platformUserId: validation.userId,
          deletedAt: null,
        },
      });

      if (!dealer) {
        console.warn('[/api/dealer/auth/setup] No dealer found for user');
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }
    }

    // Set password
    console.warn('[/api/dealer/auth/setup] Setting password for dealer:', dealer.id);
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.dealer.update({
      where: { id: dealer.id },
      data: { passwordHash },
    });

    console.warn('[/api/dealer/auth/setup] Setup complete');
    return NextResponse.json({ ok: true, dealerId: dealer.id });
  } catch (err) {
    console.error('[/api/dealer/auth/setup] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
