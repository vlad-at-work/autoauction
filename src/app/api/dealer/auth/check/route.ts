/**
 * Check dealer authentication status
 *
 * Called when dealer mini-app opens to determine routing:
 * - not_found: No dealer record for this platform user
 * - needs_setup: Dealer exists but no password set
 * - authenticated: Dealer is ready to use
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      console.error('[/api/dealer/auth/check] Invalid WebApp data:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    console.warn('[/api/dealer/auth/check]', {
      platform: platformEnum,
      userId: validation.userId,
    });

    // Find dealer by platform user ID
    const dealer = await prisma.dealer.findFirst({
      where: {
        platform: platformEnum,
        platformUserId: validation.userId,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        active: true,
        passwordHash: true,
      },
    });

    if (!dealer) {
      console.warn('[/api/dealer/auth/check] Dealer not found');
      return NextResponse.json({ status: 'not_found' });
    }

    if (!dealer.active) {
      console.warn('[/api/dealer/auth/check] Dealer inactive');
      return NextResponse.json({ error: 'Dealer account is inactive' }, { status: 403 });
    }

    if (!dealer.passwordHash) {
      console.warn('[/api/dealer/auth/check] Needs password setup');
      return NextResponse.json({
        status: 'needs_setup',
        dealerId: dealer.id,
        dealerName: dealer.name,
      });
    }

    console.warn('[/api/dealer/auth/check] Authenticated');
    return NextResponse.json({
      status: 'authenticated',
      dealer: {
        id: dealer.id,
        username: dealer.username,
        name: dealer.name,
      },
    });
  } catch (err) {
    console.error('[/api/dealer/auth/check] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
