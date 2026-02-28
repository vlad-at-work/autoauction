/**
 * MAX Webhook Handler
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sendMaxMessage } from '@/lib/notifications/max';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

type BotType = 'customer' | 'dealer';

const log = logger.child({ route: 'webhooks/max' });

export const POST = withLogging('webhooks/max', async (request: Request) => {
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

    const logContext = {
      platform: 'MAX',
      updateType,
      botType,
      userId: String(userId),
      firstName,
      startPayload: startPayload || null,
    };

    log.info(logContext, '[Webhook/MAX] Received');

    if (updateType === 'bot_started') {
      if (!userId) {
        return NextResponse.json({ ok: true });
      }

      const param =
        startPayload || (messageText.startsWith('/start') ? messageText.substring(7).trim() : '');

      if (botType === 'dealer' && param) {
        // Support both old format (setup_xxx) and new format (6-digit code)
        if (param.startsWith('setup_') || /^\d{6}$/.test(param)) {
          log.info({ ...logContext, inviteParam: param }, '[Webhook/MAX] Processing dealer invite');
          await handleDealerInvite(Number(userId), firstName, param);
        } else {
          log.info({ ...logContext }, '[Webhook/MAX] Sending dealer welcome (no invite)');
          await sendMaxMessage(
            Number(userId),
            `👋 Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню ниже.`,
            [],
            'dealer'
          );
        }
      } else if (botType === 'dealer') {
        log.info({ ...logContext }, '[Webhook/MAX] Sending dealer welcome');
        await sendMaxMessage(
          Number(userId),
          `👋 Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню ниже.`,
          [],
          'dealer'
        );
      } else {
        log.info({ ...logContext }, '[Webhook/MAX] Sending customer welcome');
        const customerBotName =
          process.env.MAX_BOT_NAME || process.env.NEXT_PUBLIC_MAX_BOT_NAME || '';
        await sendMaxMessage(
          Number(userId),
          `👋 Добро пожаловать в Свои Авто, ${firstName}!\n\nНажмите кнопку ниже, чтобы создать заявку.`,
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
    captureError(err, { route: 'webhooks/max' });
    log.error({ err }, 'webhook error');
    return NextResponse.json({ ok: true });
  }
});

async function handleDealerInvite(userId: number, firstName: string, param: string) {
  // Extract token from either format
  let token: string;
  if (param.startsWith('setup_')) {
    const parts = param.split('_');
    token = parts.slice(2).join('_');
  } else {
    token = param; // 6-digit code
  }

  log.info({ platform: 'MAX', userId, token }, '[Webhook/MAX] Looking up dealer by invite token');

  const dealer = await prisma.dealer.findFirst({
    where: { inviteToken: token, deletedAt: null },
    select: { id: true, name: true, inviteTokenExpiresAt: true },
  });

  if (!dealer) {
    log.warn({ platform: 'MAX', userId, token }, '[Webhook/MAX] Invalid invite token');
    await sendMaxMessage(userId, 'Ссылка недействительна.', [], 'dealer');
    return;
  }

  if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
    log.warn(
      { platform: 'MAX', userId, dealerId: dealer.id },
      '[Webhook/MAX] Invite token expired'
    );
    await sendMaxMessage(userId, 'Срок действия ссылки истек.', [], 'dealer');
    return;
  }

  log.info(
    { platform: 'MAX', userId, dealerId: dealer.id, dealerName: dealer.name },
    '[Webhook/MAX] Valid invite, sending welcome'
  );

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
