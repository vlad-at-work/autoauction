/**
 * Dealer password login
 *
 * Body: { password: string }
 *
 * Validates initData + password for returning dealers
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { captureError } from '@/lib/hawk';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      console.error('[/api/dealer/auth/login] Invalid WebApp data:', validation.error);
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const body = (await request.json()) as { password: string };
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    console.warn('[/api/dealer/auth/login]', {
      platform: platformEnum,
      userId: validation.userId,
    });

    const dealer = await prisma.dealer.findFirst({
      where: {
        platform: platformEnum,
        platformUserId: validation.userId,
        deletedAt: null,
      },
    });

    if (!dealer || !dealer.passwordHash) {
      console.warn(
        '[/api/dealer/auth/login] Invalid credentials - dealer not found or no password'
      );
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!dealer.active) {
      console.warn('[/api/dealer/auth/login] Account inactive');
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, dealer.passwordHash);

    if (!valid) {
      console.warn('[/api/dealer/auth/login] Invalid password');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    console.warn('[/api/dealer/auth/login] Login successful');
    return NextResponse.json({
      ok: true,
      dealer: {
        id: dealer.id,
        username: dealer.username,
        name: dealer.name,
      },
    });
  } catch (err) {
    captureError(err, { route: 'dealer/auth/login' });
    console.error('[/api/dealer/auth/login] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
