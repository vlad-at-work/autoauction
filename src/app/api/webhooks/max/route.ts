/**
 * MAX Webhook Handler
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sendMaxMessage } from '@/lib/notifications/max';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';

type BotType = 'customer' | 'dealer';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const botParam = url.searchParams.get('bot');
    const botType: BotType = botParam === 'dealer' ? 'dealer' : 'customer';
    const update = (await request.json()) as Record<string, unknown>;

    const updateType = update.update_type as string;
    const userId =
      (update.user as Record<string, unknown>)?.user_id ||
      ((update.message as Record<string, unknown>)?.sender as Record<string, unknown>)?.user_id;
    // MAX bot_started events put the ?start= param in update.payload (not start_payload)
    const startPayload = (update.payload || update.start_payload || update.start_param) as string;
    const messageText =
      (((update.message as Record<string, unknown>)?.body as Record<string, unknown>)
        ?.text as string) || '';
    const firstName =
      ((update.user as Record<string, unknown>)?.first_name as string) ||
      (((update.message as Record<string, unknown>)?.sender as Record<string, unknown>)
        ?.first_name as string) ||
      'User';

    console.warn(
      '[MAX Webhook]',
      updateType,
      botType,
      userId ? `user:${userId}` : 'no-user',
      startPayload ? `param:${startPayload}` : 'no-param'
    );

    if (updateType === 'bot_started') {
      if (!userId) {
        return NextResponse.json({ ok: true });
      }

      const param =
        startPayload || (messageText.startsWith('/start') ? messageText.substring(7).trim() : '');

      if (botType === 'dealer' && param) {
        // Support both old format (setup_xxx) and new format (6-digit code)
        if (param.startsWith('setup_') || /^\d{6}$/.test(param)) {
          await handleDealerInvite(Number(userId), firstName, param);
        } else {
          await sendMaxMessage(
            Number(userId),
            `Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню ниже.`,
            [],
            'dealer'
          );
        }
      } else if (botType === 'dealer') {
        await sendMaxMessage(
          Number(userId),
          `Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню ниже.`,
          [],
          'dealer'
        );
      } else {
        const customerBotName =
          process.env.MAX_BOT_NAME || process.env.NEXT_PUBLIC_MAX_BOT_NAME || '';
        await sendMaxMessage(
          Number(userId),
          `Добро пожаловать в AutoAuction, ${firstName}!\n\nНажмите кнопку ниже, чтобы создать заявку.`,
          [
            {
              type: 'open_app',
              text: 'Создать заявку',
              web_app: customerBotName,
              payload: 'inquiry',
            },
          ],
          'customer'
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MAX Webhook] Error:', err);
    return NextResponse.json({ ok: true });
  }
}

async function handleDealerInvite(userId: number, firstName: string, param: string) {
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
    await sendMaxMessage(userId, 'Ссылка недействительна.', [], 'dealer');
    return;
  }

  if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
    await sendMaxMessage(userId, 'Срок действия ссылки истек.', [], 'dealer');
    return;
  }

  const botName =
    process.env.MAX_BOT_NAME_DEALER || process.env.NEXT_PUBLIC_MAX_BOT_NAME_DEALER || '';

  await sendMaxMessage(
    userId,
    `Добро пожаловать, ${dealer.name || firstName}!\n\nВаш код активации: ${token}\n\nНажмите кнопку ниже, чтобы открыть приложение.`,
    [
      {
        type: 'open_app',
        text: 'Открыть панель дилера',
        web_app: botName,
        payload: token,
      },
    ],
    'dealer'
  );
}
