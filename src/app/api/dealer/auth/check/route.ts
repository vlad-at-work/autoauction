/**
 * Check dealer auth - MAXIMUM LOGGING VERSION
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  console.warn('[=== CHECK START ===]');
  console.warn('[CHECK] Timestamp:', new Date().toISOString());
  console.warn('[CHECK] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));

  try {
    const authHeader = request.headers.get('Authorization');
    console.warn('[CHECK] Auth header present:', !!authHeader);
    console.warn('[CHECK] Auth header first 100 chars:', authHeader?.substring(0, 100));

    const validation = validateWebAppRequest(authHeader, 'dealer');
    console.warn('[CHECK] Validation result:', JSON.stringify(validation));

    if (!validation.valid) {
      console.warn('[CHECK] ERROR: Invalid WebApp data:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';
    console.warn('[CHECK] platformEnum:', platformEnum);
    console.warn('[CHECK] userId:', validation.userId);

    console.warn('[CHECK] Querying database...');
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
    console.warn('[CHECK] DB result:', dealer ? `Found dealer ${dealer.id}` : 'NOT FOUND');

    if (!dealer) {
      console.warn('[CHECK] Returning: not_found');
      console.warn('[=== CHECK END ===]');
      return NextResponse.json({ status: 'not_found' });
    }

    if (!dealer.active) {
      console.warn('[CHECK] ERROR: Dealer inactive');
      return NextResponse.json({ error: 'Dealer account is inactive' }, { status: 403 });
    }

    if (!dealer.passwordHash) {
      console.warn('[CHECK] Returning: needs_setup');
      console.warn('[=== CHECK END ===]');
      return NextResponse.json({
        status: 'needs_setup',
        dealerId: dealer.id,
        dealerName: dealer.name,
      });
    }

    console.warn('[CHECK] Returning: authenticated');
    console.warn('[=== CHECK END ===]');
    return NextResponse.json({
      status: 'authenticated',
      dealer: {
        id: dealer.id,
        username: dealer.username,
        name: dealer.name,
      },
    });
  } catch (err) {
    console.error('[CHECK] CRITICAL ERROR:', err);
    console.error('[CHECK] Stack:', (err as Error).stack);
    console.warn('[=== CHECK END (ERROR) ===]');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
