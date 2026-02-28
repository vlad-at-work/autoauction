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
import { logger, withLogging } from '@/lib/logger';

const log = logger.child({ route: 'dealer/auth/login' });

export const POST = withLogging('dealer/auth/login', async (request: Request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      log.warn({ error: validation.error }, 'invalid webapp data');
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const body = (await request.json()) as { password: string };
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 });
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    log.info({ platform: platformEnum, userId: validation.userId }, 'login attempt');

    const dealer = await prisma.dealer.findFirst({
      where: {
        platform: platformEnum,
        platformUserId: validation.userId,
        deletedAt: null,
      },
    });

    if (!dealer || !dealer.passwordHash) {
      log.warn('invalid credentials - dealer not found or no password');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!dealer.active) {
      log.warn({ dealerId: dealer.id }, 'account inactive');
      return NextResponse.json({ error: 'Account inactive' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, dealer.passwordHash);

    if (!valid) {
      log.warn({ dealerId: dealer.id }, 'invalid password');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    log.info({ dealerId: dealer.id }, 'login successful');
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
    log.error({ err }, 'error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
