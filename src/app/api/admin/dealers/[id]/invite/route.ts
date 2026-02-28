/**
 * Admin endpoint to generate dealer invite link
 *
 * POST /api/admin/dealers/[id]/invite
 *
 * Generates a new invite token for the dealer and returns the invite URL
 * The link uses ?start= to open a CHAT with the bot (not the mini-app directly)
 * so the dealer gets a persistent communication channel for notifications
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createInviteTokenData } from '@/lib/auth/dealer-invite';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const MAX_BOT_NAME_DEALER =
  process.env.MAX_BOT_NAME_DEALER || process.env.NEXT_PUBLIC_MAX_BOT_NAME_DEALER || '';

const log = logger.child({ route: 'admin/dealers/[id]/invite' });

export const POST = withLogging(
  'admin/dealers/[id]/invite',
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
        },
      });

      if (!dealer || dealer.deletedAt) {
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }

      // Generate new invite token (6 digits, no dash)
      const { token, expiresAt } = createInviteTokenData();

      // Update dealer with new invite token (clears any old one)
      await prisma.dealer.update({
        where: { id: dealerId },
        data: {
          inviteToken: token,
          inviteTokenExpiresAt: expiresAt,
        },
      });

      // Construct invite URLs for both platforms
      const maxInviteUrl = `https://max.ru/${MAX_BOT_NAME_DEALER}?start=${token}`;

      const tgBotName = process.env.TG_BOT_NAME_DEALER;
      const tgInviteUrl = tgBotName ? `https://t.me/${tgBotName}?start=${token}` : null;

      log.info({ dealerName: dealer.name, dealerId, token }, 'invite link generated');

      return NextResponse.json({
        ok: true,
        inviteToken: token,
        inviteTokenExpiresAt: expiresAt,
        inviteUrl: maxInviteUrl,
        maxInviteUrl,
        tgInviteUrl,
      });
    } catch (err) {
      captureError(err, { route: 'admin/dealers/[id]/invite' });
      log.error({ err }, 'generate invite error');
      return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
  }
);
