/**
 * MAX Webhook Handler
 *
 * Receives webhook updates from MAX platform
 * Routes events to appropriate handlers for both customer and dealer bots
 *
 * Query param: ?bot=dealer or ?bot=customer (defaults to customer)
 */

import { NextResponse } from 'next/server';

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_BOT_TOKEN_DEALER = process.env.MAX_BOT_TOKEN_DEALER;
const MAX_BOT_NAME = process.env.MAX_BOT_NAME || 'AutoAuctionBot';
const MAX_BOT_NAME_DEALER = process.env.MAX_BOT_NAME_DEALER || 'AutoAuctionDealerBot';
const MAX_API_BASE = 'https://platform-api.max.ru';

type BotType = 'customer' | 'dealer';

type MaxChat = { chat_id?: string | number };
type MaxUser = { user_id?: number; first_name?: string };

type MaxMessage = {
  chat?: MaxChat;
  from?: MaxUser;
  text?: string;
};

type MaxCallback = {
  from?: MaxUser;
  data?: string;
  message?: { chat?: MaxChat };
};

type MaxEvent = {
  from?: MaxUser;
  type?: string;
};

type MaxWebhookUpdate = {
  type?: string;
  object?: {
    message?: MaxMessage;
    callback?: MaxCallback;
    event?: MaxEvent;
  };
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

    // Validate MAX event structure
    if (!update.type || !update.object) {
      console.warn('[MAX] Invalid webhook format');
      return NextResponse.json({ ok: true });
    }

    // Log incoming event
    console.warn('[MAX] Received event:', {
      type: update.type,
      botType,
      userId: update.object.message?.from?.user_id || update.object.callback?.from?.user_id,
    });

    // Route to appropriate handler
    switch (update.type) {
      case 'message_new':
        if (update.object.message) {
          await handleMaxMessageNew(update.object.message, botType);
        }
        break;
      case 'message_callback':
        if (update.object.callback) {
          await handleMaxMessageCallback(update.object.callback, botType);
        }
        break;
      case 'message_event':
        if (update.object.event) {
          await handleMaxMessageEvent(update.object.event, botType);
        }
        break;
      default:
        console.warn(`[MAX] Unknown event type: ${update.type}`);
    }

    // Must respond quickly with 200 OK (MAX timeout is 2-3 seconds)
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MAX] Webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}

async function handleMaxMessageNew(message: MaxMessage, botType: BotType) {
  try {
    const chatId = message.chat?.chat_id;
    const userId = message.from?.user_id;
    const text = message.text || '';
    const firstName = message.from?.first_name || 'User';

    if (chatId == null) {
      console.warn('[MAX] Message missing chat_id');
      return;
    }

    console.warn(
      `[MAX] Message from ${userId} (chat: ${chatId}, bot: ${botType}): "${text.substring(0, 50)}"`
    );

    // Handle /start command
    if (text === '/start') {
      if (botType === 'dealer') {
        await handleDealerStart(chatId, firstName);
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
  } catch (err) {
    console.error('[MAX] Failed to handle message:', err);
  }
}

async function handleCustomerStart(chatId: string | number, firstName: string) {
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
                type: 'link',
                text: '📱 Открыть приложение',
                url: `https://max.ru/${maxBotName}?startapp=dashboard`,
              },
            ],
          ],
        },
      },
    ],
    'customer'
  );
}

async function handleDealerStart(chatId: string | number, firstName: string) {
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
                type: 'link',
                text: '📱 Панель дилера',
                url: `https://max.ru/${maxBotName}?startapp=dashboard`,
              },
            ],
          ],
        },
      },
    ],
    'dealer'
  );
}

async function handleCustomerHelp(chatId: string | number) {
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

async function handleDealerHelp(chatId: string | number) {
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

async function handleMaxMessageCallback(callback: MaxCallback, botType: BotType) {
  try {
    const userId = callback.from?.user_id;
    const data = callback.data;

    console.warn(`[MAX] Callback from ${userId} (bot: ${botType}): ${data}`);

    // Handle specific callbacks based on data
    // You can use this to implement button interactions
  } catch (err) {
    console.error('[MAX] Failed to handle callback:', err);
  }
}

async function handleMaxMessageEvent(event: MaxEvent, botType: BotType) {
  try {
    const userId = event.from?.user_id;
    const type = event.type;

    console.warn(`[MAX] Event from ${userId} (bot: ${botType}): ${type}`);

    // Handle mini-app open, etc.
  } catch (err) {
    console.error('[MAX] Failed to handle event:', err);
  }
}

/**
 * Helper to send message to MAX with optional attachments
 * Uses correct API format: chat_id in URL params
 */
async function sendMaxMessage(
  chatId: string | number,
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
