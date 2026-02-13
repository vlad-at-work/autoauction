/**
 * MAX Webhook Handler
 *
 * Receives webhook updates from MAX platform for both customer and dealer bots
 * Query param: ?bot=dealer or ?bot=customer (defaults to customer)
 *
 * MAX Webhook Format:
 * {
 *   "update_type": "message_created" | "bot_started" | "message_callback",
 *   "timestamp": 1234567890,
 *   "message": { sender, recipient, body },
 *   "user_locale": "ru"
 * }
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

type MaxWebhookUpdate = {
  update_type: 'message_created' | 'bot_started' | 'message_callback';
  timestamp: number;
  // For bot_started events
  user?: {
    user_id: number;
    first_name?: string;
    last_name?: string;
    name?: string;
  };
  // For bot_started events (parameter from invite link)
  start_param?: string;
  // For message_created events
  message?: {
    sender?: {
      user_id: number;
      first_name?: string;
      last_name?: string;
      name?: string;
    };
    recipient?: {
      chat_id: number;
      chat_type: string;
    };
    body?: {
      text?: string;
    };
  };
  callback?: {
    user: {
      user_id: number;
      name?: string;
    };
    payload: string;
  };
};

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const botParam = url.searchParams.get('bot');
    const botType: BotType = botParam === 'dealer' ? 'dealer' : 'customer';

    const update = (await request.json()) as MaxWebhookUpdate;

    // Extract userId from the right field based on update_type
    const userId =
      update.update_type === 'bot_started' ? update.user?.user_id : update.message?.sender?.user_id;

    console.warn('[MAX Webhook]', {
      update_type: update.update_type,
      botType,
      userId,
      timestamp: update.timestamp,
    });

    // Handle different update types
    switch (update.update_type) {
      case 'bot_started':
        // bot_started has user at root level and optional start_param
        if (update.user) {
          await handleBotStarted(update.user, update.start_param, botType);
        }
        break;

      case 'message_created':
        if (update.message) {
          await handleMessage(update.message, botType);
        }
        break;

      case 'message_callback':
        if (update.callback) {
          console.warn('[MAX Webhook] Callback received:', update.callback);
          // Handle button callbacks if needed in future
        }
        break;

      default:
        console.warn(`[MAX Webhook] Unknown update_type: ${update.update_type}`);
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
 * Handle bot_started event (user clicks Start button or opens bot)
 * This is sent when user first interacts with the bot
 */
async function handleBotStarted(
  user: NonNullable<MaxWebhookUpdate['user']>,
  startParam: string | undefined,
  botType: BotType
) {
  const userId = user.user_id;
  const firstName = user.first_name || user.name || 'User';

  if (!userId) {
    console.warn('[MAX Webhook] Missing user_id in bot_started');
    return;
  }

  console.warn(`[MAX Webhook] Bot started by ${userId} (${botType})`, {
    startParam,
    firstName,
  });

  if (botType === 'dealer') {
    await handleDealerStart(userId, firstName, startParam);
  } else {
    await handleBuyerStart(userId, firstName);
  }
}

async function handleMessage(message: NonNullable<MaxWebhookUpdate['message']>, botType: BotType) {
  const userId = message.sender?.user_id;
  const text = message.body?.text || '';
  const firstName = message.sender?.first_name || message.sender?.name || 'User';

  if (!userId) {
    console.warn('[MAX Webhook] Missing user_id in message');
    return;
  }

  console.warn(`[MAX Webhook] Message from ${userId} (${botType}):`, {
    text: text.substring(0, 100),
  });

  // Handle /start command (with or without parameters)
  if (text.startsWith('/start')) {
    const param = text.substring(7).trim(); // Extract parameter after "/start "

    if (botType === 'dealer') {
      await handleDealerStart(userId, firstName, param);
    } else {
      await handleBuyerStart(userId, firstName);
    }
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
      await sendMaxMessage(
        userId,
        '❌ Invalid invite link format. Please contact administrator.',
        [],
        'dealer'
      );
      return;
    }

    const dealerId = parts[1];
    const token = parts.slice(2).join('_'); // Token may contain underscores

    console.warn('[MAX Webhook] Processing invite:', { dealerId, tokenLength: token.length });

    // Validate token in database
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
      await sendMaxMessage(
        userId,
        '❌ Invite link is invalid. Please contact administrator.',
        [],
        'dealer'
      );
      return;
    }

    if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
      console.warn('[MAX Webhook] Invite token expired');
      await sendMaxMessage(
        userId,
        '❌ Invite link has expired. Please request a new one from administrator.',
        [],
        'dealer'
      );
      return;
    }

    // Send welcome with mini-app button
    console.warn('[MAX Webhook] Sending invite welcome for dealer:', dealer.name);

    await sendMaxMessage(
      userId,
      `👋 Welcome, ${dealer.name || 'Dealer'}!\n\nClick the button below to activate your dealer account:`,
      [
        {
          type: 'open_app',
          text: '🚀 Activate Account',
          app_name: MAX_BOT_NAME_DEALER,
          payload: param, // Pass setup_xxx_yyy to mini-app as start_param
        },
      ],
      'dealer'
    );
  } else {
    // Regular /start without invite link
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
