/**
 * MAX Webhook Handler
 *
 * Receives webhook updates from MAX platform for both customer and dealer bots
 * Query param: ?bot=dealer or ?bot=customer (defaults to customer)
 *
 * MAX API docs: POST /messages?user_id={user_id} for sending
 * Update object: { update_type, timestamp, message: { sender, recipient, body }, user_locale }
 */

import { NextResponse } from 'next/server';
import { sendMaxMessage } from '@/lib/notifications/max';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';

const MAX_BOT_NAME =
  process.env.MAX_BOT_NAME || process.env.NEXT_PUBLIC_MAX_BOT_NAME || 'AutoAuctionBot';
const MAX_BOT_NAME_DEALER =
  process.env.MAX_BOT_NAME_DEALER ||
  process.env.NEXT_PUBLIC_MAX_BOT_NAME_DEALER ||
  'AutoAuctionDealerBot';

type BotType = 'customer' | 'dealer';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const botParam = url.searchParams.get('bot');
    const botType: BotType = botParam === 'dealer' ? 'dealer' : 'customer';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = (await request.json()) as Record<string, any>;

    // Log raw payload for debugging (critical to understand MAX's actual format)
    console.warn('[MAX Webhook] RAW:', JSON.stringify(update).substring(0, 500));

    const updateType = update.update_type as string;

    // Extract userId from all possible locations:
    // - message.sender.user_id (message_created)
    // - user.user_id (possible bot_started format)
    // - message.sender.user_id (bot_started might also use message format)
    const userId =
      update.user?.user_id || update.message?.sender?.user_id || update.message?.from?.user_id;

    const chatId = update.chat?.chat_id || update.message?.recipient?.chat_id;

    // Extract start payload from all possible locations
    const startPayload = update.start_payload || update.start_param || update.payload;

    // Extract message text
    const messageText = update.message?.body?.text || '';

    // Extract user name
    const firstName =
      update.user?.first_name ||
      update.user?.name ||
      update.message?.sender?.first_name ||
      update.message?.sender?.name ||
      'User';

    console.warn('[MAX Webhook]', {
      update_type: updateType,
      botType,
      userId,
      chatId,
      startPayload,
      messageText: messageText.substring(0, 50),
      firstName,
    });

    switch (updateType) {
      case 'bot_started': {
        if (!userId) {
          console.warn('[MAX Webhook] bot_started but no userId found');
          break;
        }

        // For bot_started, start_payload may be at root level or we extract from message text
        let param = startPayload;

        // Also check if message text contains /start with param
        if (!param && messageText.startsWith('/start')) {
          param = messageText.substring(7).trim();
        }

        if (botType === 'dealer') {
          await handleDealerStart(userId, firstName, param || undefined);
        } else {
          await handleBuyerStart(userId, firstName);
        }
        break;
      }

      case 'message_created': {
        if (!userId) {
          console.warn('[MAX Webhook] message_created but no userId found');
          break;
        }

        // Handle /start command in message text
        if (messageText.startsWith('/start')) {
          const param = messageText.substring(7).trim();
          if (botType === 'dealer') {
            await handleDealerStart(userId, firstName, param || undefined);
          } else {
            await handleBuyerStart(userId, firstName);
          }
        }
        break;
      }

      case 'message_callback':
        console.warn('[MAX Webhook] Callback received');
        break;

      default:
        console.warn(`[MAX Webhook] Unknown update_type: ${updateType}`);
    }

    // CRITICAL: Must respond quickly with 200 OK (MAX timeout is ~2-3 seconds)
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MAX Webhook] Error:', err);
    // Still return 200 OK to avoid webhook disconnection
    return NextResponse.json({ ok: true });
  }
}

/**
 * Handle dealer bot /start command
 * Param format: "setup_dealerId_token" for invite links
 */
async function handleDealerStart(userId: number, firstName: string, param?: string) {
  console.warn('[MAX Webhook] Dealer start:', { userId, param });

  // Check if this is an invite link: /start setup_dealerId_token
  if (param && param.startsWith('setup_')) {
    const parts = param.split('_');

    if (parts.length < 3) {
      console.warn('[MAX Webhook] Invalid invite format:', parts);
      await sendMaxMessage(userId, '❌ Invalid invite link format.', [], 'dealer');
      return;
    }

    const dealerId = parts[1];
    const token = parts.slice(2).join('_');

    console.warn('[MAX Webhook] Processing invite:', { dealerId, tokenLength: token.length });

    const dealer = await prisma.dealer.findFirst({
      where: {
        id: dealerId,
        inviteToken: token,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        inviteTokenExpiresAt: true,
      },
    });

    if (!dealer) {
      console.warn('[MAX Webhook] Dealer not found or token mismatch');
      await sendMaxMessage(userId, '❌ Invite link is invalid.', [], 'dealer');
      return;
    }

    if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
      console.warn('[MAX Webhook] Invite token expired');
      await sendMaxMessage(userId, '❌ Invite link has expired.', [], 'dealer');
      return;
    }

    console.warn('[MAX Webhook] Sending invite welcome for dealer:', dealer.name);

    await sendMaxMessage(
      userId,
      `👋 Welcome, ${dealer.name || 'Dealer'}!\n\nClick the button below to activate your dealer account:`,
      [
        {
          type: 'open_app',
          text: '🚀 Activate Account',
          app_name: MAX_BOT_NAME_DEALER,
          payload: param,
        },
      ],
      'dealer'
    );
  } else {
    console.warn('[MAX Webhook] Regular dealer start (no invite)');

    await sendMaxMessage(
      userId,
      `👋 Welcome to AutoAuction Dealer Panel!\n\nUse the button below to open the dealer app:`,
      [
        {
          type: 'open_app',
          text: '📱 Open Dealer Panel',
          app_name: MAX_BOT_NAME_DEALER,
        },
      ],
      'dealer'
    );
  }
}

/**
 * Handle buyer bot /start command
 */
async function handleBuyerStart(userId: number, firstName: string) {
  console.warn('[MAX Webhook] Buyer start:', { userId, firstName });

  await sendMaxMessage(
    userId,
    `👋 Welcome to AutoAuction, ${firstName}!\n\nCreate car inquiries and receive competitive offers from dealers:`,
    [
      {
        type: 'open_app',
        text: '🚗 Open App',
        app_name: MAX_BOT_NAME,
      },
    ],
    'customer'
  );
}
