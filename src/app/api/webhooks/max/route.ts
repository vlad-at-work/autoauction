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
import { normalizePhone } from '@/lib/phone';
import { checkRateLimit } from '@/lib/rate-limit';

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

    // Rate limit: 60 requests per minute per bot (using userId as identifier)
    const rateLimitId = userId
      ? `max_webhook:${botType}:${userId}`
      : `max_webhook:${botType}:ip:${request.headers.get('x-forwarded-for') || 'unknown'}`;
    const rateLimitResult = checkRateLimit(rateLimitId, 60, 60 * 1000);
    if (!rateLimitResult.success) {
      log.warn({ ...logContext, rateLimitResult }, '[Webhook/MAX] Rate limited');
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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
        // Customer bot: send welcome with request_contact only (app locked until phone verified)
        log.info({ ...logContext }, '[Webhook/MAX] Sending customer welcome with request_contact');

        await sendMaxMessage(
          Number(userId),
          `👋 Добро пожаловать в Свои Авто, ${firstName}!\n\n Пожалуйста, подтвердите ваш номер телефона прямо здесь в Max перед тем как оставить заявку.\n\nВаши данные скрыты и передаются только выбранному вами дилеру.`,
          [[{ type: 'request_contact', text: '📱 Подтвердить номер' }]],
          'customer'
        );
      }
    }

    // Handle contact sharing (message_created with contact attachment)
    if (updateType === 'message_created' && botType === 'customer') {
      const message = update.message as Record<string, unknown> | undefined;
      // Contact shares arrive at message.attachments (not message.body.attachments)
      const directAttachments = (message?.attachments as Array<Record<string, unknown>>) ?? [];
      const bodyAttachments =
        ((message?.body as Record<string, unknown>)?.attachments as Array<
          Record<string, unknown>
        >) ?? [];
      const allAttachments = directAttachments.length > 0 ? directAttachments : bodyAttachments;
      const contactAttachment = allAttachments.find((att) => att.type === 'contact');

      log.info(
        {
          ...logContext,
          directAttachmentCount: directAttachments.length,
          directAttachmentTypes: directAttachments.map((a) => a.type),
          bodyAttachmentCount: bodyAttachments.length,
          bodyAttachmentTypes: bodyAttachments.map((a) => a.type),
          contactFound: !!contactAttachment,
        },
        '[Webhook/MAX] message_created: attachments'
      );

      if (contactAttachment && userId) {
        const payload = contactAttachment.payload as Record<string, unknown> | undefined;

        log.info(
          { ...logContext, payloadKeys: Object.keys(payload ?? {}), payload },
          '[Webhook/MAX] contact payload'
        );

        const phone = payload?.phone as string | undefined;

        // Fall back to vcf_info parsing if phone field is absent/null
        let resolvedPhone: string | null = phone ?? null;
        if (!resolvedPhone && payload?.vcf_info) {
          const vcf = payload.vcf_info as string;
          const match = vcf.match(/^TEL[^:]*:(.+)$/m);
          if (match) resolvedPhone = match[1].trim();
          log.info(
            { ...logContext, vcfPhone: resolvedPhone },
            '[Webhook/MAX] vcf_info phone parse'
          );
        }

        log.info({ ...logContext, rawPhone: resolvedPhone }, '[Webhook/MAX] raw phone');

        if (resolvedPhone) {
          const normalizedPhone = normalizePhone(resolvedPhone);

          log.info(
            { ...logContext, normalizedPhone: normalizedPhone ?? null },
            '[Webhook/MAX] normalized phone'
          );

          if (normalizedPhone) {
            // Check if buyer already has this phone verified (dedup guard for duplicate subscriptions)
            const existingBuyer = await prisma.buyer.findFirst({
              where: { platform: 'MAX', platformUserId: String(userId) },
              select: { phone: true, phoneVerified: true },
            });
            const alreadySaved =
              existingBuyer?.phoneVerified && existingBuyer.phone === normalizedPhone;

            log.info({ ...logContext, alreadySaved }, '[Webhook/MAX] dedup check');

            // Upsert buyer with phone and mark as verified
            const upsertedBuyer = await prisma.buyer.upsert({
              where: {
                platform_platformUserId: {
                  platform: 'MAX',
                  platformUserId: String(userId),
                },
              },
              update: {
                phone: normalizedPhone,
                phoneVerified: true,
                platformChatId: String(userId),
              },
              create: {
                platform: 'MAX',
                platformUserId: String(userId),
                platformChatId: String(userId),
                phone: normalizedPhone,
                phoneVerified: true,
              },
              select: { id: true },
            });

            log.info({ ...logContext, buyerId: upsertedBuyer.id }, '[Webhook/MAX] buyer upserted');

            if (alreadySaved) {
              log.info(
                { ...logContext },
                '[Webhook/MAX] duplicate delivery, sending confirmation anyway'
              );
            }

            const customerBotName =
              process.env.MAX_BOT_NAME || process.env.NEXT_PUBLIC_MAX_BOT_NAME || '';

            await sendMaxMessage(
              Number(userId),
              `Отлично! Теперь нажмите на кнопку ниже, чтобы начать:`,
              [
                [
                  {
                    type: 'open_app',
                    text: 'Создать заявку',
                    web_app: customerBotName,
                    payload: 'form',
                  },
                ],
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
