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

/**
 * Normalize phone number to 11-digit format
 * - Strips + prefix
 * - Converts 8xxx to 7xxx
 * - Adds 7 prefix to 10-digit numbers
 */
function normalizePhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  let cleaned = phone.trim().replace(/\D/g, '');

  // If it was +7 or 7, keep as is. If it starts with 8, convert to 7
  if (cleaned.length === 11 && cleaned.startsWith('8')) {
    cleaned = '7' + cleaned.slice(1);
  }

  // If it's 10 digits, assume Russian number and add 7
  if (cleaned.length === 10) {
    cleaned = '7' + cleaned;
  }

  // Validate: should be 11 digits starting with 7
  if (cleaned.length !== 11 || !cleaned.startsWith('7')) {
    return null;
  }

  return cleaned;
}

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
        // Customer bot: send welcome with request_contact + open_app buttons
        log.info({ ...logContext }, '[Webhook/MAX] Sending customer welcome with request_contact');
        const customerBotName =
          process.env.MAX_BOT_NAME || process.env.NEXT_PUBLIC_MAX_BOT_NAME || '';

        await sendMaxMessage(
          Number(userId),
          `👋 Добро пожаловать в Свои Авто, ${firstName}!\n\n📱 Поделитесь номером телефона — тогда не придётся вводить его вручную при создании заявки.\n\nИли сразу создайте заявку:`,
          [
            // Row 1: request_contact button
            [{ type: 'request_contact', text: '📱 Поделиться номером' }],
            // Row 2: open_app button
            [
              {
                type: 'open_app',
                text: 'Создать заявку',
                web_app: customerBotName,
                payload: 'inquiry',
              },
            ],
          ],
          'customer'
        );
      }
    }

    // Handle contact sharing (message_created with contact attachment)
    if (updateType === 'message_created' && botType === 'customer') {
      const message = update.message as Record<string, unknown> | undefined;
      const body = message?.body as Record<string, unknown> | undefined;
      const attachments = (body?.attachments as Array<Record<string, unknown>>) || [];

      // Look for contact attachment
      const contactAttachment = attachments.find((att) => att.type === 'contact');

      if (contactAttachment && userId) {
        const payload = contactAttachment.payload as Record<string, unknown> | undefined;
        const phone = payload?.phone as string | undefined;

        if (phone) {
          const normalizedPhone = normalizePhone(phone);

          if (normalizedPhone) {
            // Check if buyer already has this phone verified (dedup guard for duplicate subscriptions)
            const existingBuyer = await prisma.buyer.findFirst({
              where: { platform: 'MAX', platformUserId: String(userId) },
              select: { phone: true, phoneVerified: true },
            });
            const alreadySaved =
              existingBuyer?.phoneVerified && existingBuyer.phone === normalizedPhone;

            log.info(
              { ...logContext, phone: normalizedPhone, alreadySaved },
              '[Webhook/MAX] Contact shared, updating buyer'
            );

            // Upsert buyer with phone and mark as verified
            await prisma.buyer.upsert({
              where: {
                platform_platformUserId: {
                  platform: 'MAX',
                  platformUserId: String(userId),
                },
              },
              update: {
                phone: normalizedPhone,
                phoneVerified: true,
                platformChatId: String(userId), // Ensure we have chat ID for notifications
              },
              create: {
                platform: 'MAX',
                platformUserId: String(userId),
                platformChatId: String(userId),
                phone: normalizedPhone,
                phoneVerified: true,
              },
            });

            // Send confirmation only once (guard against duplicate subscription delivery)
            if (alreadySaved) {
              return NextResponse.json({ ok: true });
            }

            const customerBotName =
              process.env.MAX_BOT_NAME || process.env.NEXT_PUBLIC_MAX_BOT_NAME || '';

            await sendMaxMessage(
              Number(userId),
              `✅ Номер телефона сохранён: +${normalizedPhone}\n\nТеперь при создании заявки телефон будет подставляться автоматически.`,
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

            log.info(
              { ...logContext, phone: normalizedPhone },
              '[Webhook/MAX] Contact shared confirmation sent'
            );
          } else {
            log.warn({ ...logContext, rawPhone: phone }, '[Webhook/MAX] Failed to normalize phone');
          }
        }
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
