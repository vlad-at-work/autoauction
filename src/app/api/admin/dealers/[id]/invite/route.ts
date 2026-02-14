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

const MAX_BOT_NAME_DEALER =
  process.env.MAX_BOT_NAME_DEALER || process.env.NEXT_PUBLIC_MAX_BOT_NAME_DEALER || '';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: dealerId } = await params;

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

    // Construct invite URL that opens a CHAT with the bot (not mini-app directly)
    // ?start= creates a chat; the webhook then sends a welcome + open_app button
    const inviteUrl = `https://max.ru/${MAX_BOT_NAME_DEALER}?start=${token}`;

    console.warn(`[Admin] Generated invite link for dealer ${dealer.name} (${dealerId}): ${token}`);

    return NextResponse.json({
      ok: true,
      inviteToken: token,
      inviteTokenExpiresAt: expiresAt,
      inviteUrl,
    });
  } catch (err) {
    console.error('[Admin] Generate invite error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
