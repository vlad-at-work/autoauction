/**
 * Set dealer password - MAXIMUM LOGGING VERSION
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  console.warn('[=== SETUP START ===]');
  console.warn('[SETUP] Timestamp:', new Date().toISOString());
  console.warn('[SETUP] Request URL:', request.url);
  console.warn('[SETUP] Request method:', request.method);
  console.warn('[SETUP] Headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));

  try {
    const authHeader = request.headers.get('Authorization');
    console.warn('[SETUP] Auth header:', authHeader?.substring(0, 100));

    const validation = validateWebAppRequest(authHeader, 'dealer');
    console.warn('[SETUP] Validation result:', validation);

    if (!validation.valid) {
      console.warn('[SETUP] ERROR: Invalid WebApp data:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    let body;
    try {
      const rawBody = await request.text();
      console.warn('[SETUP] Raw body:', rawBody);
      body = JSON.parse(rawBody);
      console.warn('[SETUP] Parsed body:', body);
    } catch (parseErr) {
      console.error('[SETUP] ERROR parsing body:', parseErr);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { password, startParam } = body;
    console.warn('[SETUP] Password length:', password?.length);
    console.warn('[SETUP] Has startParam:', !!startParam);
    console.warn('[SETUP] startParam:', startParam);
    console.warn('[SETUP] Platform:', validation.platform);
    console.warn('[SETUP] UserId:', validation.userId);

    if (!password || password.length < 8) {
      console.warn('[SETUP] ERROR: Password too short:', password?.length);
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';
    console.warn('[SETUP] platformEnum:', platformEnum);

    let dealer;

    if (startParam?.startsWith('setup_')) {
      console.warn('[SETUP] Processing invite token');
      const parts = startParam.split('_');
      console.warn('[SETUP] Parts:', parts);

      const dealerId = parts[1];
      const token = parts.slice(2).join('_');
      console.warn('[SETUP] dealerId:', dealerId);
      console.warn('[SETUP] token length:', token.length);

      console.warn('[SETUP] Looking up dealer in DB...');
      dealer = await prisma.dealer.findFirst({
        where: {
          id: dealerId,
          inviteToken: token,
          deletedAt: null,
        },
      });
      console.warn('[SETUP] DB lookup result:', dealer ? `Found dealer ${dealer.id}` : 'NOT FOUND');

      if (!dealer) {
        console.warn('[SETUP] ERROR: Dealer not found');
        return NextResponse.json({ error: 'Invalid invite link' }, { status: 400 });
      }

      console.warn('[SETUP] Checking token expiry...');
      const isValid = isInviteTokenValid(dealer.inviteTokenExpiresAt);
      console.warn('[SETUP] Token valid?', isValid);
      console.warn('[SETUP] Expires at:', dealer.inviteTokenExpiresAt);

      if (!isValid) {
        console.warn('[SETUP] ERROR: Token expired');
        return NextResponse.json({ error: 'Invite link has expired' }, { status: 400 });
      }

      if (dealer.platform && dealer.platformUserId && dealer.platformUserId !== validation.userId) {
        console.warn('[SETUP] ERROR: Already claimed by different user');
        console.warn('[SETUP] Existing userId:', dealer.platformUserId);
        console.warn('[SETUP] New userId:', validation.userId);
        return NextResponse.json(
          { error: 'This dealer account is already claimed' },
          { status: 409 }
        );
      }

      console.warn('[SETUP] Updating dealer with platform binding...');
      const updateResult = await prisma.dealer.update({
        where: { id: dealerId },
        data: {
          platform: platformEnum,
          platformUserId: validation.userId,
          platformChatId: validation.userId,
          inviteToken: null,
          inviteTokenExpiresAt: null,
        },
      });
      console.warn('[SETUP] Dealer updated:', updateResult.id);
    } else {
      console.warn('[SETUP] No invite token, looking up existing dealer...');
      dealer = await prisma.dealer.findFirst({
        where: {
          platform: platformEnum,
          platformUserId: validation.userId,
          deletedAt: null,
        },
      });
      console.warn('[SETUP] Existing dealer lookup:', dealer ? `Found ${dealer.id}` : 'NOT FOUND');

      if (!dealer) {
        console.warn('[SETUP] ERROR: No dealer found for user');
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }
    }

    console.warn('[SETUP] Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);
    console.warn('[SETUP] Password hashed, length:', passwordHash.length);

    console.warn('[SETUP] Saving password to dealer:', dealer.id);
    const finalResult = await prisma.dealer.update({
      where: { id: dealer.id },
      data: { passwordHash },
    });
    console.warn(
      '[SETUP] Password saved. Dealer:',
      finalResult.id,
      'has password?',
      !!finalResult.passwordHash
    );

    console.warn('[SETUP] SUCCESS');
    console.warn('[=== SETUP END ===]');
    return NextResponse.json({ ok: true, dealerId: dealer.id });
  } catch (err) {
    console.error('[SETUP] CRITICAL ERROR:', err);
    console.error('[SETUP] Stack:', (err as Error).stack);
    console.warn('[=== SETUP END (ERROR) ===]');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
