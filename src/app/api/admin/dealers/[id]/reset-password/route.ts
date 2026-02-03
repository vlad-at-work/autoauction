import { NextRequest, NextResponse } from 'next/server';
import { parseBasicAuthHeader } from '@/lib/auth/basic';
import { createPasswordResetCode } from '@/lib/auth/dealer-auth';
import { sendDealerPasswordResetCode } from '@/lib/notifications';
import { prisma } from '@/lib/db';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * Trigger password reset for a dealer (admin only)
 * Generates a 6-digit code and sends it via the dealer's platform bot
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Validate admin auth
  const auth = parseBasicAuthHeader(request.headers.get('authorization'));
  if (!auth || auth.username !== ADMIN_USERNAME || auth.password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: dealerId } = await params;

  try {
    // Find dealer
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: {
        id: true,
        username: true,
        name: true,
        platform: true,
        platformUserId: true,
        platformChatId: true,
      },
    });

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    if (!dealer.platform || !dealer.platformUserId) {
      return NextResponse.json(
        { error: 'Dealer has not registered via mini-app yet' },
        { status: 400 }
      );
    }

    // Generate reset code
    const code = await createPasswordResetCode(dealerId);

    // Send code via dealer bot
    const result = await sendDealerPasswordResetCode(
      {
        platform: dealer.platform,
        platformChatId: dealer.platformChatId,
        platformUserId: dealer.platformUserId,
      },
      code
    );

    if (!result.success) {
      console.error('Failed to send reset code:', result.error);
      return NextResponse.json({ error: `Failed to send code: ${result.error}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Reset code sent to ${dealer.name || dealer.username} via ${dealer.platform}`,
    });
  } catch (error) {
    console.error('[/api/admin/dealers/[id]/reset-password] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
