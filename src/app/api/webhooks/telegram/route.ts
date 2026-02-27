/**
 * Telegram Webhook Handler
 *
 * Mirrors src/app/api/webhooks/max/route.ts for Telegram Bot API
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/notifications/telegram';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';
import { captureError } from '@/lib/hawk';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type BotType = 'customer' | 'dealer';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const botParam = url.searchParams.get('bot');
    const botType: BotType = botParam === 'dealer' ? 'dealer' : 'customer';

    // Verify webhook secret
    const secret =
      botType === 'dealer' ? process.env.TG_DEALER_WEBHOOK_SECRET : process.env.TG_WEBHOOK_SECRET;
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
    if (secret && headerSecret !== secret) {
      console.warn('[Telegram Webhook] Unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const update = (await request.json()) as Record<string, unknown>;

    const message = update.message as
      | {
          message_id: number;
          from?: { id: number; first_name?: string };
          chat?: { id: number };
          text?: string;
        }
      | undefined;

    if (!message) {
      // Acknowledge non-message updates (like callback queries) but don't process
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id;
    const userId = message.from?.id;
    const firstName = message.from?.first_name || 'User';
    const text = message.text || '';

    console.warn('[Telegram Webhook]', {
      bot: botType,
      chatId,
      userId,
      text: text.substring(0, 50),
    });

    // Handle /start command
    if (text.startsWith('/start')) {
      if (!chatId || !userId) {
        return NextResponse.json({ ok: true });
      }

      const param = text.substring(7).trim(); // Extract everything after "/start "

      if (botType === 'dealer' && param) {
        // Support both old format (setup_xxx) and new format (6-digit code)
        if (param.startsWith('setup_') || /^\d{6}$/.test(param)) {
          await handleDealerInviteTelegram(chatId, firstName, param);
        } else {
          await sendTelegramMessage(
            chatId,
            `👋 Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню бота.`,
            undefined,
            'dealer'
          );
        }
      } else if (botType === 'dealer') {
        await sendTelegramMessage(
          chatId,
          `👋 Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню бота.`,
          undefined,
          'dealer'
        );
      } else {
        await sendTelegramMessage(
          chatId,
          `👋 Добро пожаловать в Свои Авто, ${firstName}!\n\nНажмите кнопку ниже, чтобы создать заявку.`,
          [
            {
              text: 'Создать заявку',
              web_app: {
                url: `${APP_URL}/app?startapp=inquiry`,
              },
            },
          ],
          'customer'
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err, { route: 'webhooks/telegram' });
    console.error('[Telegram Webhook] Error:', err);
    return NextResponse.json({ ok: true });
  }
}

async function handleDealerInviteTelegram(chatId: number, firstName: string, param: string) {
  // Extract token from either format
  let token: string;
  if (param.startsWith('setup_')) {
    const parts = param.split('_');
    token = parts.slice(2).join('_');
  } else {
    token = param; // 6-digit code
  }

  const dealer = await prisma.dealer.findFirst({
    where: { inviteToken: token, deletedAt: null },
    select: { id: true, name: true, inviteTokenExpiresAt: true },
  });

  if (!dealer) {
    await sendTelegramMessage(chatId, '❌ Код приглашения недействителен.', undefined, 'dealer');
    return;
  }

  if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
    await sendTelegramMessage(
      chatId,
      '❌ Срок действия кода приглашения истек.',
      undefined,
      'dealer'
    );
    return;
  }

  const text = `Добро пожаловать, ${firstName}!\n\nВаш код активации для ${dealer.name}: ${token}\n\nНажмите кнопку ниже, чтобы открыть приложение.`;

  const buttons = [
    {
      text: 'Открыть панель дилера',
      web_app: {
        url: `${APP_URL}/dealerinterface?startapp=${token}`,
      },
    },
  ];

  await sendTelegramMessage(chatId, text, buttons, 'dealer');
}
