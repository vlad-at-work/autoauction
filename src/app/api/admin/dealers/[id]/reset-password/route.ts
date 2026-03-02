/**
 * Admin endpoint to reset a dealer's password
 *
 * POST /api/admin/dealers/[id]/reset-password
 *
 * Sets passwordHash to null, forcing the dealer to set a new password
 * via the invite/setup flow. Admin must then generate a new invite link.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const log = logger.child({ route: 'admin/dealers/[id]/reset-password' });

export const POST = withLogging(
  'admin/dealers/[id]/reset-password',
  async (request: Request, context: unknown) => {
    try {
      const { id: dealerId } = await (context as { params: Promise<{ id: string }> }).params;

      // Find dealer
      const dealer = await prisma.dealer.findUnique({
        where: { id: dealerId },
        select: {
          id: true,
          name: true,
          deletedAt: true,
          passwordHash: true,
        },
      });

      if (!dealer || dealer.deletedAt) {
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }

      if (!dealer.passwordHash) {
        return NextResponse.json({ error: 'Dealer password is not set' }, { status: 400 });
      }

      // Reset password by clearing the hash
      await prisma.dealer.update({
        where: { id: dealerId },
        data: {
          passwordHash: null,
        },
      });

      log.info({ dealerName: dealer.name, dealerId }, 'password reset');

      return NextResponse.json({
        ok: true,
        message: 'Password reset. Dealer must set new password via invite link.',
      });
    } catch (err) {
      captureError(err, { route: 'admin/dealers/[id]/reset-password' });
      log.error({ err }, 'reset password error');
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  }
);
