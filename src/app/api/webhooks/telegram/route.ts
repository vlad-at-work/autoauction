/**
 * Telegram Webhook Handler
 *
 * Receives webhook updates from Telegram
 * Verifies secret token and routes events appropriately
 */

import { NextResponse } from 'next/server';

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_WEBHOOK_SECRET = process.env.TG_WEBHOOK_SECRET;

export async function POST(request: Request) {
  try {
    // Verify webhook secret
    const secret = request.headers.get('x-telegram-bot-api-secret-token');
    if (secret !== TG_WEBHOOK_SECRET) {
      console.warn('[Telegram] Invalid webhook secret');
      return NextResponse.json({ error: 'Invalid secret' }, { status: 403 });
    }

    const update = await request.json() as any;

    // Log incoming update
    console.log('[Telegram] Received update:', {
      update_id: update.update_id,
      type: Object.keys(update).find((k) => ['message', 'callback_query', 'web_app_data'].includes(k)),
    });

    // Route to appropriate handler
    if (update.message) {
      if (update.message.text === '/start') {
        await handleTelegramStart(update.message);
      } else {
        await handleTelegramMessage(update.message);
      }
    } else if (update.callback_query) {
      await handleTelegramCallback(update.callback_query);
    } else if (update.web_app_data) {
      await handleTelegramWebAppData(update.web_app_data);
    }

    // Telegram requires immediate 200 response
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Telegram] Webhook error:', err);
    // Still return 200 to acknowledge receipt
    return NextResponse.json({ ok: true });
  }
}

async function handleTelegramStart(message: any) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const firstName = message.from.first_name || 'User';

  console.log(`[Telegram] User started bot: ${userId} (chat: ${chatId}, name: ${firstName})`);

  // Send welcome message with mini-app button
  const text = `👋 Добро пожаловать, ${firstName}!

Это AutoAuction - платформа обратных аукционов для автомобилей.

Нажмите кнопку ниже, чтобы открыть приложение:`;

  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
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
    console.error('[Telegram] Failed to send start message:', err);
  }
}

async function handleTelegramMessage(message: any) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text || '';

  console.log(`[Telegram] Message from ${userId}: "${text.substring(0, 50)}"`);

  // Handle specific commands or messages
  if (text.includes('помощь') || text.includes('help')) {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
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

async function handleTelegramCallback(callbackQuery: any) {
  const callbackId = callbackQuery.id;
  const chatId = callbackQuery.message?.chat.id;
  const data = callbackQuery.data;

  console.log(`[Telegram] Callback: ${data}`);

  // Acknowledge callback (removes loading state)
  try {
    await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/answerCallbackQuery`, {
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

async function handleTelegramWebAppData(webAppData: any) {
  console.log('[Telegram] WebApp data received:', webAppData);
}
