/**
 * MAX Webhook Handler
 *
 * Receives webhook updates from MAX platform
 * Routes events to appropriate handlers for both customer and dealer bots
 *
 * Query param: ?bot=dealer or ?bot=customer (defaults to customer)
 *
 * MAX Webhook Format (from docs):
 * {
 *   "update_type": "message_created" | "bot_started" | "message_callback",
 *   "timestamp": 1234567890,
 *   "message": { ... },
 *   "user_locale": "ru"
 * }
 */

import { NextResponse } from 'next/server';

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_BOT_TOKEN_DEALER = process.env.MAX_BOT_TOKEN_DEALER;
const MAX_BOT_NAME = process.env.MAX_BOT_NAME || 'AutoAuctionBot';
const MAX_BOT_NAME_DEALER = process.env.MAX_BOT_NAME_DEALER || 'AutoAuctionDealerBot';
const MAX_API_BASE = 'https://platform-api.max.ru';

type BotType = 'customer' | 'dealer';

// MAX API User structure
type MaxUser = {
  user_id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
};

// MAX API Recipient (chat)
type MaxRecipient = {
  chat_id: number;
  chat_type: 'dialog' | 'chat' | 'channel';
};

// MAX API Message body
type MaxMessageBody = {
  text?: string;
  format?: 'plain' | 'markdown' | 'html';
  attachments?: unknown[];
};

// MAX API Message structure
type MaxMessage = {
  sender?: MaxUser;
  recipient?: MaxRecipient;
  timestamp: number;
  body?: MaxMessageBody;
};

// MAX API Webhook Update
type MaxWebhookUpdate = {
  update_type: 'message_created' | 'bot_started' | 'message_callback' | string;
  timestamp: number;
  message?: MaxMessage;
  callback?: {
    user: MaxUser;
    payload: string;
    message?: MaxMessage;
  };
  user_locale?: string;
};

function getMaxToken(botType: BotType = 'customer'): string | undefined {
  return botType === 'dealer' ? MAX_BOT_TOKEN_DEALER : MAX_BOT_TOKEN;
}

function getMaxBotName(botType: BotType = 'customer'): string {
  return botType === 'dealer' ? MAX_BOT_NAME_DEALER : MAX_BOT_NAME;
}

export async function POST(request: Request) {
  try {
    // Determine which bot this webhook is for
    const url = new URL(request.url);
    const botParam = url.searchParams.get('bot');
    const botType: BotType = botParam === 'dealer' ? 'dealer' : 'customer';

    const token = getMaxToken(botType);
    if (!token || token === '<from_vercel>') {
      const tokenName = botType === 'dealer' ? 'MAX_BOT_TOKEN_DEALER' : 'MAX_BOT_TOKEN';
      console.warn(`[MAX] ${tokenName} not configured`);
      return NextResponse.json({ ok: true });
    }

    const update = (await request.json()) as MaxWebhookUpdate;

    console.warn('[MAX] Webhook received:', {
      update_type: update.update_type,
      botType,
      timestamp: update.timestamp,
    });

    // Handle different update types
    switch (update.update_type) {
      case 'bot_started':
        // User clicked /start or opened chat with bot for the first time
        if (update.message?.sender) {
          await handleBotStarted(update.message, botType);
        }
        break;

      case 'message_created':
        // New message received
        if (update.message) {
          await handleMessageCreated(update.message, botType);
        }
        break;

      case 'message_callback':
        // Callback from inline keyboard
        if (update.callback) {
          await handleMessageCallback(update.callback, botType);
        }
        break;

      default:
        console.warn(`[MAX] Unknown update_type: ${update.update_type}`);
    }

    // Must respond quickly with 200 OK (MAX timeout is 2-3 seconds)
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MAX] Webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}

async function handleBotStarted(message: MaxMessage, botType: BotType) {
  const chatId = message.recipient?.chat_id;
  const user = message.sender;
  const userId = user?.user_id;
  const firstName = user?.first_name || user?.name || 'User';

  if (!chatId) {
    console.warn('[MAX] bot_started: missing chat_id');
    return;
  }

  console.warn(`[MAX] Bot started by ${userId} (chat: ${chatId}, bot: ${botType})`);

  // Send welcome message
  if (botType === 'dealer') {
    await handleDealerStart(chatId, firstName);
  } else {
    await handleCustomerStart(chatId, firstName);
  }
}

async function handleMessageCreated(message: MaxMessage, botType: BotType) {
  const chatId = message.recipient?.chat_id;
  const user = message.sender;
  const userId = user?.user_id;
  const text = message.body?.text || '';
  const firstName = user?.first_name || user?.name || 'User';

  if (!chatId) {
    console.warn('[MAX] message_created: missing chat_id');
    return;
  }

  console.warn(
    `[MAX] Message from ${userId} (chat: ${chatId}, bot: ${botType}): "${text.substring(0, 50)}"`
  );

  // Handle /start command (with or without parameters)
  if (text.startsWith('/start')) {
    const startParam = text.substring(6).trim(); // Extract parameter after /start

    if (botType === 'dealer') {
      if (startParam && startParam.startsWith('claim_')) {
        // Invite link: send welcome with claim button
        await handleDealerInviteStart(chatId, firstName, startParam);
      } else {
        // Regular start
        await handleDealerStart(chatId, firstName);
      }
    } else {
      await handleCustomerStart(chatId, firstName);
    }
  } else if (text.toLowerCase().includes('помощь') || text.toLowerCase().includes('help')) {
    if (botType === 'dealer') {
      await handleDealerHelp(chatId);
    } else {
      await handleCustomerHelp(chatId);
    }
  }
}

async function handleMessageCallback(
  callback: { user: MaxUser; payload: string; message?: MaxMessage },
  botType: BotType
) {
  const userId = callback.user.user_id;
  const payload = callback.payload;

  console.warn(`[MAX] Callback from ${userId} (bot: ${botType}): ${payload}`);

  // Handle specific callbacks based on payload
  // You can use this to implement button interactions
}

async function handleCustomerStart(chatId: number, firstName: string) {
  const maxBotName = getMaxBotName('customer');
  await sendMaxMessage(
    chatId,
    `👋 Добро пожаловать, ${firstName}!

Это AutoAuction - платформа обратных аукционов для автомобилей.

Нажмите кнопку ниже, чтобы открыть приложение:`,
    [
      {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              {
                type: 'open_app',
                text: '📱 Открыть приложение',
                app_name: maxBotName,
                payload: 'dashboard',
              },
            ],
          ],
        },
      },
    ],
    'customer'
  );
}

async function handleDealerStart(chatId: number, firstName: string) {
  const maxBotName = getMaxBotName('dealer');
  await sendMaxMessage(
    chatId,
    `👋 Добро пожаловать, ${firstName}!

Это AutoAuction для дилеров - платформа обратных аукционов.

Нажмите кнопку ниже, чтобы открыть панель дилера:`,
    [
      {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              {
                type: 'open_app',
                text: '📱 Панель дилера',
                app_name: maxBotName,
                payload: 'dashboard',
              },
            ],
          ],
        },
      },
    ],
    'dealer'
  );
}

async function handleDealerInviteStart(chatId: number, firstName: string, claimParam: string) {
  const maxBotName = getMaxBotName('dealer');
  await sendMaxMessage(
    chatId,
    `🎉 Добро пожаловать в AutoAuction, ${firstName}!

Вы получили приглашение стать дилером на нашей платформе обратных аукционов.

Нажмите кнопку ниже, чтобы активировать вашу учетную запись:`,
    [
      {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              {
                type: 'open_app',
                text: '🚀 Активировать учетную запись',
                app_name: maxBotName,
                payload: claimParam,
              },
            ],
          ],
        },
      },
    ],
    'dealer'
  );
}

async function handleCustomerHelp(chatId: number) {
  await sendMaxMessage(
    chatId,
    `ℹ️ Справка по использованию:

1. Нажмите "Открыть приложение"
2. Создайте новую заявку
3. Получайте предложения от дилеров
4. Выбирайте лучшее предложение`,
    undefined,
    'customer'
  );
}

async function handleDealerHelp(chatId: number) {
  await sendMaxMessage(
    chatId,
    `ℹ️ Справка для дилеров:

1. Нажмите "Панель дилера"
2. Просматривайте активные заявки
3. Делайте предложения клиентам
4. Получайте уведомления о принятых предложениях`,
    undefined,
    'dealer'
  );
}

/**
 * Helper to send message to MAX with optional attachments
 * Uses correct API format: chat_id in URL params
 */
async function sendMaxMessage(
  chatId: number,
  text: string,
  attachments?: Array<Record<string, unknown>>,
  botType: BotType = 'customer'
): Promise<boolean> {
  try {
    const token = getMaxToken(botType);
    if (!token) {
      const tokenName = botType === 'dealer' ? 'MAX_BOT_TOKEN_DEALER' : 'MAX_BOT_TOKEN';
      console.error(`[MAX] ${tokenName} not configured`);
      return false;
    }

    const url = new URL(`${MAX_API_BASE}/messages`);
    url.searchParams.set('chat_id', String(chatId));

    const body: Record<string, unknown> = { text };
    if (attachments && attachments.length > 0) {
      body.attachments = attachments;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('[MAX] Failed to send message:', await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error('[MAX] Error sending message:', err);
    return false;
  }
}
