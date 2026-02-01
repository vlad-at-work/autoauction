/**
 * MAX Webhook Handler
 *
 * Receives webhook updates from MAX platform
 * Routes events to appropriate handlers
 */

import { NextResponse } from 'next/server';

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;

export async function POST(request: Request) {
  try {
    const update = await request.json() as any;

    // Validate MAX event structure
    if (!update.type || !update.object) {
      console.warn('[MAX] Invalid webhook format');
      return NextResponse.json({ ok: true }); // Still return ok
    }

    // Log incoming event
    console.log('[MAX] Received event:', {
      type: update.type,
      userId: update.object.message?.from?.user_id || update.object.callback?.from?.user_id,
    });

    // Route to appropriate handler
    switch (update.type) {
      case 'message_new':
        await handleMaxMessageNew(update.object.message);
        break;
      case 'message_callback':
        await handleMaxMessageCallback(update.object.callback);
        break;
      case 'message_event':
        await handleMaxMessageEvent(update.object.event);
        break;
      default:
        console.log(`[MAX] Unknown event type: ${update.type}`);
    }

    // Must respond quickly with 200 OK (MAX timeout is 2-3 seconds)
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MAX] Webhook error:', err);
    // Still return 200 to acknowledge receipt
    return NextResponse.json({ ok: true });
  }
}

async function handleMaxMessageNew(message: any) {
  try {
    const chatId = message.chat?.chat_id;
    const userId = message.from?.user_id;
    const text = message.text || '';
    const firstName = message.from?.first_name || 'User';

    console.log(`[MAX] Message from ${userId} (chat: ${chatId}): "${text.substring(0, 50)}"`);

    // Handle /start command
    if (text === '/start') {
      await sendMaxMessage(
        chatId,
        `👋 Добро пожаловать, ${firstName}!

Это AutoAuction - платформа обратных аукционов для автомобилей.

Нажмите кнопку ниже, чтобы открыть приложение:`,
        {
          inline_keyboard: [
            [
              {
                text: 'Открыть приложение',
                type: 'open_app',
                app: {
                  url: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
                },
              },
            ],
          ],
        }
      );
    } else if (text.toLowerCase().includes('помощь')) {
      await sendMaxMessage(
        chatId,
        `ℹ️ Справка по использованию:

1. Нажмите "Открыть приложение"
2. Создайте новую заявку
3. Получайте предложения от дилеров
4. Выбирайте лучшее предложение`
      );
    }
  } catch (err) {
    console.error('[MAX] Failed to handle message:', err);
  }
}

async function handleMaxMessageCallback(callback: any) {
  try {
    const userId = callback.from?.user_id;
    const data = callback.data;
    const chatId = callback.message?.chat?.chat_id;

    console.log(`[MAX] Callback from ${userId}: ${data}`);

    // Handle specific callbacks based on data
    // You can use this to implement button interactions
  } catch (err) {
    console.error('[MAX] Failed to handle callback:', err);
  }
}

async function handleMaxMessageEvent(event: any) {
  try {
    const userId = event.from?.user_id;
    const type = event.type;

    console.log(`[MAX] Event from ${userId}: ${type}`);

    // Handle mini-app open, etc.
  } catch (err) {
    console.error('[MAX] Failed to handle event:', err);
  }
}

/**
 * Helper to send message to MAX
 */
async function sendMaxMessage(
  chatId: number,
  text: string,
  replyMarkup?: any
): Promise<boolean> {
  try {
    const body: any = {
      chat_id: chatId,
      text,
    };

    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch('https://platform-api.max.ru/messages', {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN!,
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
