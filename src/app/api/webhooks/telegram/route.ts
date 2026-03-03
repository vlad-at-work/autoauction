/**
 * Telegram Webhook Handler
 *
 * Mirrors src/app/api/webhooks/max/route.ts for Telegram Bot API
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { sendTelegramMessage, sendTelegramContactRequest } from '@/lib/notifications/telegram';
import { prisma } from '@/lib/db';
import { isInviteTokenValid } from '@/lib/auth/dealer-invite';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';
import { normalizePhone } from '@/lib/phone';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type BotType = 'customer' | 'dealer';

const log = logger.child({ route: 'webhooks/telegram' });

export const POST = withLogging('webhooks/telegram', async (request: Request) => {
  try {
    const url = new URL(request.url);
    const botParam = url.searchParams.get('bot');
    const botType: BotType = botParam === 'dealer' ? 'dealer' : 'customer';

    // Verify webhook secret
    const secret =
      botType === 'dealer' ? process.env.TG_DEALER_WEBHOOK_SECRET : process.env.TG_WEBHOOK_SECRET;
    const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
    if (secret && headerSecret !== secret) {
      log.warn('unauthorized request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const update = (await request.json()) as Record<string, unknown>;

    const message = update.message as
      | {
          message_id: number;
          from?: { id: number; first_name?: string; username?: string };
          chat?: { id: number };
          text?: string;
          contact?: {
            phone_number: string;
            first_name: string;
            last_name?: string;
            user_id?: number;
          };
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

    const logContext = {
      platform: 'Telegram',
      botType,
      chatId: String(chatId),
      userId: String(userId),
      firstName,
      text: text.substring(0, 50),
    };

    log.info(logContext, '[Webhook/Telegram] Received');

    // Handle /start command
    if (text.startsWith('/start')) {
      if (!chatId || !userId) {
        return NextResponse.json({ ok: true });
      }

      const param = text.substring(7).trim(); // Extract everything after "/start "

      if (botType === 'dealer' && param) {
        // Support both old format (setup_xxx) and new format (6-digit code)
        if (param.startsWith('setup_') || /^\d{6}$/.test(param)) {
          log.info(
            { ...logContext, inviteParam: param },
            '[Webhook/Telegram] Processing dealer invite'
          );
          await handleDealerInviteTelegram(chatId, firstName, param);
        } else {
          log.info({ ...logContext }, '[Webhook/Telegram] Sending dealer welcome (no invite)');
          await sendTelegramMessage(
            chatId,
            `👋 Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню бота.`,
            undefined,
            'dealer'
          );
        }
      } else if (botType === 'dealer') {
        log.info({ ...logContext }, '[Webhook/Telegram] Sending dealer welcome');
        await sendTelegramMessage(
          chatId,
          `👋 Добро пожаловать в панель дилера, ${firstName}!\n\nОткройте мини-приложение из меню бота.`,
          undefined,
          'dealer'
        );
      } else {
        // Customer bot: send welcome with request_contact (app locked until phone verified)
        log.info(
          { ...logContext },
          '[Webhook/Telegram] Sending customer welcome with request_contact'
        );
        await sendTelegramContactRequest(
          chatId,
          `👋 Добро пожаловать в Свои Авто, ${firstName}!\n\nПожалуйста, поделитесь вашим номером телефона, нажав кнопку ниже, перед тем как оставить заявку.\n\nВаши данные скрыты и передаются только выбранному вами дилеру.`,
          '📱 Поделиться номером',
          'customer'
        );
      }
    }

    // Handle contact sharing (Telegram sends message.contact when user taps request_contact button)
    if (message?.contact && botType === 'customer' && chatId && userId) {
      const contact = message.contact;

      log.info(
        { ...logContext, contactUserId: contact.user_id },
        '[Webhook/Telegram] Contact received'
      );

      const normalizedPhone = normalizePhone(contact.phone_number);

      log.info(
        { ...logContext, rawPhone: contact.phone_number, normalizedPhone },
        '[Webhook/Telegram] Phone normalize'
      );

      if (normalizedPhone) {
        // Dedup guard: check if buyer already has this phone verified
        const existingBuyer = await prisma.buyer.findFirst({
          where: { platform: 'TELEGRAM', platformUserId: String(userId) },
          select: { phone: true, phoneVerified: true },
        });
        const alreadySaved =
          existingBuyer?.phoneVerified && existingBuyer.phone === normalizedPhone;

        log.info({ ...logContext, alreadySaved }, '[Webhook/Telegram] dedup check');

        // Upsert buyer with verified phone
        const upsertedBuyer = await prisma.buyer.upsert({
          where: {
            platform_platformUserId: {
              platform: 'TELEGRAM',
              platformUserId: String(userId),
            },
          },
          update: {
            phone: normalizedPhone,
            phoneVerified: true,
            platformChatId: String(chatId),
          },
          create: {
            platform: 'TELEGRAM',
            platformUserId: String(userId),
            platformChatId: String(chatId),
            phone: normalizedPhone,
            phoneVerified: true,
          },
          select: { id: true },
        });

        log.info({ ...logContext, buyerId: upsertedBuyer.id }, '[Webhook/Telegram] buyer upserted');

        if (alreadySaved) {
          log.info(
            { ...logContext },
            '[Webhook/Telegram] duplicate delivery, skipping confirmation'
          );
          return NextResponse.json({ ok: true });
        }

        await sendTelegramMessage(
          chatId,
          'Отлично! Теперь нажмите на кнопку ниже, чтобы начать:',
          [{ text: 'Создать заявку', web_app: { url: `${APP_URL}/app?startapp=form` } }],
          'customer'
        );

        log.info(
          { ...logContext, phone: normalizedPhone },
          '[Webhook/Telegram] Contact shared confirmation sent'
        );
      } else {
        log.warn(
          { ...logContext, rawPhone: contact.phone_number },
          '[Webhook/Telegram] Failed to normalize phone'
        );
        await sendTelegramMessage(
          chatId,
          'Не удалось распознать номер телефона. Пожалуйста, попробуйте ещё раз.',
          undefined,
          'customer'
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err, { route: 'webhooks/telegram' });
    log.error({ err }, 'webhook error');
    return NextResponse.json({ ok: true });
  }
});

async function handleDealerInviteTelegram(chatId: number, firstName: string, param: string) {
  // Extract token from either format
  let token: string;
  if (param.startsWith('setup_')) {
    const parts = param.split('_');
    token = parts.slice(2).join('_');
  } else {
    token = param; // 6-digit code
  }

  log.info(
    { platform: 'Telegram', chatId, token },
    '[Webhook/Telegram] Looking up dealer by invite token'
  );

  const dealer = await prisma.dealer.findFirst({
    where: { inviteToken: token, deletedAt: null },
    select: { id: true, name: true, inviteTokenExpiresAt: true },
  });

  if (!dealer) {
    log.warn({ platform: 'Telegram', chatId, token }, '[Webhook/Telegram] Invalid invite token');
    await sendTelegramMessage(chatId, '❌ Код приглашения недействителен.', undefined, 'dealer');
    return;
  }

  if (!isInviteTokenValid(dealer.inviteTokenExpiresAt)) {
    log.warn(
      { platform: 'Telegram', chatId, dealerId: dealer.id },
      '[Webhook/Telegram] Invite token expired'
    );
    await sendTelegramMessage(
      chatId,
      '❌ Срок действия кода приглашения истек.',
      undefined,
      'dealer'
    );
    return;
  }

  log.info(
    { platform: 'Telegram', chatId, dealerId: dealer.id, dealerName: dealer.name },
    '[Webhook/Telegram] Valid invite, sending welcome'
  );

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
