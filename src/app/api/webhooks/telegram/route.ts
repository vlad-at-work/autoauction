/**
 * Telegram Webhook Handler
 *
 * Receives webhook updates from Telegram
 * Supports both customer and dealer bots
 * Verifies secret token and routes events appropriately
 *
 * Query param: ?bot=dealer or ?bot=customer (defaults to customer)
 */

import { NextResponse } from 'next/server';

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_BOT_TOKEN_DEALER = process.env.TG_BOT_TOKEN_DEALER;
const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET;
const TG_WEBHOOK_SECRET_DEALER = process.env.TG_WEBHOOK_SECRET_DEALER;

type BotType = 'customer' | 'dealer';

type TelegramChat = { id: number };
type TelegramUser = { id: number; first_name?: string };
type TelegramMessage = { chat: TelegramChat; from: TelegramUser; text?: string };
type TelegramCallbackQuery = { id: string; data?: string; message?: { chat: TelegramChat } };
type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  web_app_data?: unknown;
};

function getBotToken(botType: BotType): string | undefined {
  return botType === 'dealer' ? TG_BOT_TOKEN_DEALER : TG_BOT_TOKEN;
}

function getWebhookSecret(botType: BotType): string | undefined {
  return botType === 'dealer' ? TG_WEBHOOK_SECRET_DEALER : TG_WEBHOOK_SECRET;
}

export async function POST(request: Request) {
  try {
    // Determine which bot this webhook is for
    const url = new URL(request.url);
    const botParam = url.searchParams.get('bot');
    const botType: BotType = botParam === 'dealer' ? 'dealer' : 'customer';

    const token = getBotToken(botType);
    const expectedSecret = getWebhookSecret(botType);

    // Verify webhook secret
    const secret = request.headers.get('x-telegram-bot-api-secret-token');
    if (expectedSecret && secret !== expectedSecret) {
      console.warn(`[Telegram] Invalid webhook secret for ${botType} bot`);
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    if (!token) {
      const tokenName = botType === 'dealer' ? 'TG_BOT_TOKEN_DEALER' : 'TG_BOT_TOKEN';
      console.warn(`[Telegram] ${tokenName} not configured`);
      return NextResponse.json({ ok: true });
    }

    const update = (await request.json()) as TelegramUpdate;

    // Log incoming update
    console.warn('[Telegram] Received update:', {
      update_id: update.update_id,
      botType,
      type: Object.keys(update).find((k) =>
        ['message', 'callback_query', 'web_app_data'].includes(k)
      ),
    });

    // Route to appropriate handler
    if (update.message) {
      const text = update.message.text || '';
      if (text.startsWith('/start')) {
        const startParam = text.substring(6).trim(); // Extract parameter after /start
        await handleTelegramStart(update.message, botType, startParam);
      } else {
        await handleTelegramMessage(update.message, botType);
      }
    } else if (update.callback_query) {
      await handleTelegramCallback(update.callback_query, botType);
    } else if (update.web_app_data) {
      await handleTelegramWebAppData(update.web_app_data, botType);
    }

    // Telegram requires immediate 200 response
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Telegram] Webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}

async function handleTelegramStart(message: TelegramMessage, botType: BotType, startParam: string) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const firstName = message.from.first_name || 'User';
  const token = getBotToken(botType);

  if (!token) return;

  console.warn(
    `[Telegram] User started ${botType} bot: ${userId} (chat: ${chatId}, name: ${firstName}, param: ${startParam || 'none'})`
  );

  if (botType === 'dealer') {
    if (startParam && startParam.startsWith('claim_')) {
      // Invite link: send welcome with claim button
      await handleTelegramDealerInvite(message, startParam);
    } else {
      // Regular start
      const text = `👋 Добро пожаловать, ${firstName}!

Это AutoAuction для дилеров - платформа обратных аукционов.

Нажмите кнопку ниже, чтобы открыть панель дилера:`;

      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '📱 Панель дилера',
                    web_app: {
                      url: `${process.env.NEXT_PUBLIC_APP_URL}/dealerinterface`,
                    },
                  },
                ],
              ],
            },
          }),
        });
      } catch (err) {
        console.error('[Telegram] Failed to send dealer start message:', err);
      }
    }
  } else {
    // Customer bot
    const text = `👋 Добро пожаловать, ${firstName}!

Это AutoAuction - платформа обратных аукционов для автомобилей.

Нажмите кнопку ниже, чтобы открыть приложение:`;

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '📱 Открыть приложение',
                  web_app: {
                    url: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
                  },
                },
              ],
            ],
          },
        }),
      });
    } catch (err) {
      console.error('[Telegram] Failed to send customer start message:', err);
    }
  }
}

async function handleTelegramDealerInvite(message: TelegramMessage, claimParam: string) {
  const chatId = message.chat.id;
  const firstName = message.from.first_name || 'User';
  const token = getBotToken('dealer');

  if (!token) return;

  const text = `🎉 Добро пожаловать в AutoAuction, ${firstName}!

Вы получили приглашение стать дилером на нашей платформе обратных аукционов.

Нажмите кнопку ниже, чтобы активировать вашу учетную запись:`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🚀 Активировать учетную запись',
                web_app: {
                  url: `${process.env.NEXT_PUBLIC_APP_URL}/dealerinterface?startapp=${claimParam}`,
                },
              },
            ],
          ],
        },
      }),
    });
  } catch (err) {
    console.error('[Telegram] Failed to send dealer invite message:', err);
  }
}

async function handleTelegramMessage(message: TelegramMessage, botType: BotType) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || '';
  const token = getBotToken(botType);

  if (!token) return;

  console.warn(`[Telegram] Message from ${userId} (bot: ${botType}): "${text.substring(0, 50)}"`);

  // Handle help command
  if (text.toLowerCase().includes('помощь') || text.toLowerCase().includes('help')) {
    if (botType === 'dealer') {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `ℹ️ Справка для дилеров:

1. Откройте панель дилера через кнопку "📱 Панель дилера"
2. Просматривайте активные заявки от покупателей
3. Делайте свои предложения
4. Получайте уведомления, когда покупатель принимает ваше предложение

Вопросы? Обратитесь к администратору.`,
        }),
      });
    } else {
      // Customer help
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `ℹ️ Справка по использованию:

1. Откройте мини-приложение через кнопку "📱 Открыть приложение"
2. Создайте новую заявку на поиск автомобиля
3. Дилеры будут отправлять вам предложения
4. Выберите лучшее предложение

Вопросы? Напишите /support`,
        }),
      });
    }
  }
}

async function handleTelegramCallback(callbackQuery: TelegramCallbackQuery, botType: BotType) {
  const callbackId = callbackQuery.id;
  const data = callbackQuery.data;
  const token = getBotToken(botType);

  if (!token) return;

  console.warn(`[Telegram] Callback (bot: ${botType}): ${data}`);

  // Acknowledge callback (removes loading state)
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackId,
        text: '✅ Обработано',
      }),
    });
  } catch (err) {
    console.error('[Telegram] Failed to answer callback:', err);
  }
}

async function handleTelegramWebAppData(webAppData: unknown, botType: BotType) {
  console.warn(`[Telegram] WebApp data received (bot: ${botType}):`, webAppData);
}
