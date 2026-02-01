/**
 * MAX Webhook Handler
 *
 * Receives webhook updates from MAX platform
 * Routes events to appropriate handlers
 */

import { NextResponse } from 'next/server';

import { sendMaxMessage as sendMessage } from '@/lib/notifications/max';

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_API_BASE = 'https://platform-api.max.ru';

export async function POST(request: Request) {
  try {
    const update = (await request.json()) as any;

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
      const maxBotName = process.env.MAX_BOT_NAME || 'AutoAuctionBot';
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
        ]
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
 * Helper to send message to MAX with optional attachments
 * Uses correct API format: chat_id in URL params
 */
async function sendMaxMessage(
  chatId: string | number,
  text: string,
  attachments?: Array<Record<string, unknown>>
): Promise<boolean> {
  try {
    const url = new URL(`${MAX_API_BASE}/messages`);
    url.searchParams.set('chat_id', String(chatId));

    const body: Record<string, unknown> = { text };
    if (attachments && attachments.length > 0) {
      body.attachments = attachments;
    }

    const response = await fetch(url.toString(), {
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
