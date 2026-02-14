/**
 * MAX Webhook Handler
 */

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
    const startPayload = (update.start_payload || update.start_param) as string;
    const messageText =
      (((update.message as Record<string, unknown>)?.body as Record<string, unknown>)
        ?.text as string) || '';
    const firstName =
      ((update.user as Record<string, unknown>)?.first_name as string) ||
      (((update.message as Record<string, unknown>)?.sender as Record<string, unknown>)
        ?.first_name as string) ||
      'User';

    console.warn('[WEBHOOK]', { type: updateType, bot: botType, userId, hasParam: !!startPayload });

    if (
      updateType === 'bot_started' ||
      (updateType === 'message_created' && messageText.startsWith('/start'))
    ) {
      if (!userId) {
        console.warn('[WEBHOOK] No userId');
        return NextResponse.json({ ok: true });
      }

      const param =
        startPayload || (messageText.startsWith('/start') ? messageText.substring(7).trim() : '');

      if (botType === 'dealer' && param?.startsWith('setup_')) {
        await handleDealerInvite(Number(userId), firstName, param);
      } else if (botType === 'dealer') {
        await sendMaxMessage(
          Number(userId),
          `👋 Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню ниже.`,
          [],
          'dealer'
        );
      } else {
        await sendMaxMessage(
          Number(userId),
          `👋 Добро пожаловать в AutoAuction, ${firstName}!\n\nОткройте мини-приложение для создания заявок.`,
          [],
          'customer'
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[WEBHOOK] Error:', err);
    return NextResponse.json({ ok: true });
  }
}

async function handleDealerInvite(userId: number, firstName: string, param: string) {
  console.warn('[INVITE] Processing:', param);

  const parts = param.split('_');
  if (parts.length < 3) {
    await sendMaxMessage(userId, '❌ Неверный формат ссылки.', [], 'dealer');
    return;
  }

  const dealerId = parts[1];
  const token = parts.slice(2).join('_');

  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, inviteToken: token, deletedAt: null },
    select: { id: true, name: true, inviteTokenExpiresAt: true },
  });

  if (!dealer) {
    await sendMaxMessage(userId, '❌ Ссылка недействительна.', [], 'dealer');
    return;
  }

  if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
    await sendMaxMessage(userId, '❌ Срок действия ссылки истек.', [], 'dealer');
    return;
  }

  const messageText = `👋 Добро пожаловать, ${dealer.name || 'Дилер'}!

Ваш код активации:
\`${param}\`

1️⃣ Скопируйте код
2️⃣ Откройте мини-приложение
3️⃣ Вставьте код для активации`;

  const result = await sendMaxMessage(userId, messageText, [], 'dealer');
  console.warn('[INVITE] Sent:', result.success);
}
