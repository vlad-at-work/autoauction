import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { inquiryCreateSchema } from '@/lib/schemas/inquiry';
import {
  notifyDealerOfNewInquiryViaBot,
  notifyBuyer,
  type NotifyResult,
} from '@/lib/notifications';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const MAX_INQUIRIES_PER_MONTH = 2;
const INQUIRY_LIMIT_RESET_DAYS = 15;

const log = logger.child({ route: 'inquiries' });

async function checkAndResetInquiryLimit(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  buyerId: string
) {
  const buyer = await tx.buyer.findUnique({
    where: { id: buyerId },
    select: {
      id: true,
      inquiriesUsedThisMonth: true,
      inquiryLimitResetAt: true,
    },
  });

  if (!buyer) return null;

  const now = new Date();
  const resetAt = new Date(buyer.inquiryLimitResetAt);

  if (now >= resetAt) {
    const nextReset = new Date(now.getTime() + INQUIRY_LIMIT_RESET_DAYS * 24 * 60 * 60 * 1000);

    const updated = await tx.buyer.update({
      where: { id: buyerId },
      data: {
        inquiriesUsedThisMonth: 0,
        inquiryLimitResetAt: nextReset,
      },
      select: {
        id: true,
        inquiriesUsedThisMonth: true,
        inquiryLimitResetAt: true,
      },
    });

    return updated;
  }

  return buyer;
}

export const POST = withLogging('inquiries', async (request: Request) => {
  try {
    const authHeader = request.headers.get('authorization');
    const validation = validateWebAppRequest(authHeader);
    if (!validation.valid || !validation.userId || !validation.platform) {
      return NextResponse.json(
        { error: 'Неавторизованно: ' + (validation.error || 'unknown error') },
        { status: 401 }
      );
    }
    const authUserId = validation.userId;
    const authPlatform = validation.platform;

    const body = await request.json();
    const parsed = inquiryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Некорректный запрос',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    if (input.platformUserId !== authUserId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    if (input.platform !== authPlatform) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const platform = authPlatform === 'max' ? 'MAX' : 'TELEGRAM';

    log.info({ platform, authUserId }, '[Inquiry] Creating inquiry for buyer');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      const buyer = await tx.buyer.upsert({
        where: {
          platform_platformUserId: {
            platform,
            platformUserId: authUserId,
          },
        },
        update: {
          platformUserName: input.platformUserName,
          deletedAt: null,
          ...(input.platformChatId && { platformChatId: input.platformChatId }),
        },
        create: {
          platform,
          platformUserId: authUserId,
          platformChatId: input.platformChatId,
          platformUserName: input.platformUserName,
          inquiriesUsedThisMonth: 0,
          inquiryLimitResetAt: new Date(
            Date.now() + INQUIRY_LIMIT_RESET_DAYS * 24 * 60 * 60 * 1000
          ),
          deletedAt: null,
        },
      });

      const buyerWithLimit = await checkAndResetInquiryLimit(tx, buyer.id);
      if (!buyerWithLimit) {
        throw new Error('Buyer not found after creation');
      }

      if (buyerWithLimit.inquiriesUsedThisMonth >= MAX_INQUIRIES_PER_MONTH) {
        const resetDate = new Date(buyerWithLimit.inquiryLimitResetAt);

        log.warn(
          { buyerId: buyerWithLimit.id, inquiriesUsed: buyerWithLimit.inquiriesUsedThisMonth },
          '[Inquiry] Buyer hit inquiry limit'
        );
        return {
          success: false,
          error: 'INQUIRY_LIMIT_REACHED',
          message: `Лимит заявок: ${MAX_INQUIRIES_PER_MONTH} в 15 дней`,
          remainingInquiries: 0,
          nextInquiryAt: resetDate.toISOString(),
        };
      }

      const newInquiry = await tx.inquiry.create({
        data: {
          buyerId: buyer.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          model: input.model,
          submodel: input.submodel,
          transmission: input.transmission,
          color: input.color,
          comment: input.comment,
          consentAt: new Date(),
          expiresAt,
          deletedAt: null,
        },
        select: { id: true },
      });

      const updatedBuyer = await tx.buyer.update({
        where: { id: buyer.id },
        data: {
          inquiriesUsedThisMonth: { increment: 1 },
        },
        select: {
          id: true,
          platform: true,
          platformUserId: true,
          platformChatId: true,
          inquiriesUsedThisMonth: true,
          inquiryLimitResetAt: true,
        },
      });

      return {
        success: true,
        inquiry: newInquiry,
        buyer: updatedBuyer,
        remainingInquiries: MAX_INQUIRIES_PER_MONTH - updatedBuyer.inquiriesUsedThisMonth,
      };
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          code: result.error,
          remainingInquiries: result.remainingInquiries,
          nextInquiryAt: result.nextInquiryAt,
        },
        { status: 429 }
      );
    }

    const inquiry = result.inquiry!;
    const buyer = result.buyer!;
    const remainingInquiries = result.remainingInquiries!;

    log.info(
      {
        inquiryId: inquiry.id,
        buyerId: buyer.id,
        platform,
        model: input.model,
        submodel: input.submodel,
      },
      '[Inquiry] Inquiry created successfully'
    );

    const dealers = await prisma.dealer.findMany({
      where: {
        deletedAt: null,
        active: true,
        platform: { not: null },
        platformUserId: { not: null },
      },
      select: {
        platform: true,
        platformUserId: true,
        platformChatId: true,
      },
    });

    const claimedDealers = dealers.filter(
      (
        dealer
      ): dealer is {
        platform: NonNullable<(typeof dealers)[number]['platform']>;
        platformUserId: NonNullable<(typeof dealers)[number]['platformUserId']>;
        platformChatId: (typeof dealers)[number]['platformChatId'];
      } => Boolean(dealer.platform && dealer.platformUserId)
    );

    log.info(
      {
        inquiryId: inquiry.id,
        totalDealers: dealers.length,
        claimedDealers: claimedDealers.length,
        dealerPlatforms: claimedDealers.map((d) => d.platform),
      },
      '[Inquiry] Found dealers to notify'
    );

    const remainingText =
      remainingInquiries > 0
        ? `\n\nОсталось заявок: ${remainingInquiries} из ${MAX_INQUIRIES_PER_MONTH}`
        : `\n\nЭто была ваша последняя заявка в этом периоде.`;

    const commentText = input.comment ? `\nКомментарий: ${input.comment}` : '';

    log.info(
      { inquiryId: inquiry.id, buyerPlatform: buyer.platform, dealerCount: claimedDealers.length },
      '[Inquiry] Sending notifications'
    );

    const notificationResults = await Promise.allSettled([
      notifyBuyer(
        {
          platform: buyer.platform,
          platformChatId: buyer.platformChatId,
          platformUserId: buyer.platformUserId,
        },
        `🎉 Заявка создана!\n\n${input.model} ${input.submodel}\nКПП: ${input.transmission}\nЦвет: ${input.color}${commentText}\n\nДилеры начнут присылать вам предложения. Заявка активна 24 часа.${remainingText}`
      ),
      ...claimedDealers.map((dealer) =>
        notifyDealerOfNewInquiryViaBot(
          {
            platform: dealer.platform,
            platformChatId: dealer.platformChatId,
            platformUserId: dealer.platformUserId,
          },
          inquiry.id,
          input.model,
          input.submodel,
          input.transmission,
          input.color
        )
      ),
    ]);

    const successfulNotifications = notificationResults.filter(
      (r) => r.status === 'fulfilled' && (r.value as NotifyResult).success
    ).length;
    const failedNotifications = notificationResults.filter(
      (r) => r.status === 'rejected' || !(r.value as NotifyResult).success
    ).length;

    log.info(
      {
        inquiryId: inquiry.id,
        successful: successfulNotifications,
        failed: failedNotifications,
      },
      '[Inquiry] Notifications completed'
    );

    return NextResponse.json({
      id: inquiry.id,
      success: true,
      remainingInquiries,
      nextInquiryAt: buyer.inquiryLimitResetAt,
    });
  } catch (err) {
    captureError(err, { route: 'inquiries' });
    log.error({ err }, 'inquiry creation error');
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
});
