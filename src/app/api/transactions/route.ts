import { NextResponse } from 'next/server';

import { INTERNAL_ERROR_MESSAGE } from '@/lib/errors';
import { pluralize } from '@/lib/utils';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { notifyDealerOfAcceptedOfferViaBot, notifyBuyer } from '@/lib/notifications';
import { captureError } from '@/lib/hawk';
import { formatPhoneRU } from '@/lib/format-phone';
import { logger, withLogging } from '@/lib/logger';

const MAX_TRANSACTIONS_PER_INQUIRY = 3;

const log = logger.child({ route: 'transactions' });

const transactionCreateSchema = z.object({
  offerId: z.string().min(1),
});

export const POST = withLogging('transactions', async (request: Request) => {
  try {
    const authHeader = request.headers.get('authorization');
    const validation = validateWebAppRequest(authHeader);
    if (!validation.valid || !validation.userId || !validation.platform) {
      return NextResponse.json(
        { error: 'Неавторизованно: ' + (validation.error || 'unknown error') },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = transactionCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректный запрос', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { offerId } = parsed.data;
    const dbPlatform = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    const offer = await prisma.offer.findFirst({
      where: {
        id: offerId,
        deletedAt: null,
        inquiry: { deletedAt: null },
        dealer: { deletedAt: null },
      },
      include: {
        inquiry: {
          include: {
            buyer: true,
            transactions: true,
          },
        },
        dealer: true,
        transaction: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Предложение не найдено' }, { status: 404 });
    }

    if (
      offer.inquiry.buyer.platform !== dbPlatform ||
      offer.inquiry.buyer.platformUserId !== validation.userId
    ) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    if (offer.inquiry.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Заявка истекла' }, { status: 410 });
    }

    if (offer.transaction) {
      return NextResponse.json({ error: 'Вы уже приняли это предложение' }, { status: 409 });
    }

    const existingDealerTransaction = offer.inquiry.transactions.find(
      (t) => t.dealerId === offer.dealerId
    );
    if (existingDealerTransaction) {
      return NextResponse.json(
        { error: 'Вы уже приняли предложение от этого дилера' },
        { status: 409 }
      );
    }

    const currentTransactionCount = offer.inquiry.transactions.length;
    if (currentTransactionCount >= MAX_TRANSACTIONS_PER_INQUIRY) {
      return NextResponse.json(
        {
          error: `Достигнут лимит принятых предложений (${MAX_TRANSACTIONS_PER_INQUIRY}). Свяжитесь с выбранными дилерами.`,
        },
        { status: 409 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        inquiryId: offer.inquiryId,
        offerId,
        dealerId: offer.dealerId,
        buyerName: offer.inquiry.name,
        buyerEmail: offer.inquiry.email,
        buyerPhone: offer.inquiry.phone,
        buyerPlatform: offer.inquiry.buyer.platform,
        buyerPlatformUserId: offer.inquiry.buyer.platformUserId,
        offerPrice: offer.price,
        inquiryModel: offer.inquiry.model,
        inquirySubmodel: offer.inquiry.submodel,
        inquiryTransmission: offer.inquiry.transmission,
        inquiryColor: offer.inquiry.color,
        dealerUsername: offer.dealer.username,
        dealerName: offer.dealer.name,
        dealerSubName: offer.dealer.subName,
        dealerPhone: offer.dealer.phone,
        dealerEmail: offer.dealer.email,
        dealerDescription: offer.dealer.description,
        deletedAt: null,
      },
    });

    log.info(
      {
        transactionId: transaction.id,
        offerId,
        dealerId: offer.dealerId,
        inquiryId: offer.inquiryId,
        buyerPlatform: offer.inquiry.buyer.platform,
        price: offer.price,
      },
      '[Transaction] Transaction created (offer accepted)'
    );

    const formattedPhone = formatPhoneRU(offer.inquiry.phone);
    const dealerName = offer.dealer.name || offer.dealer.username;
    const remainingAcceptances = MAX_TRANSACTIONS_PER_INQUIRY - currentTransactionCount - 1;

    const buyerMessage = `🎉 Вы приняли предложение от ${dealerName}!

${offer.inquiry.model} ${offer.inquiry.submodel}
${offer.price.toLocaleString('ru-RU')} \u20BD

Дилер скоро свяжется с вами по номеру ${formattedPhone}.

${remainingAcceptances > 0 ? `Вы можете принять ещё ${remainingAcceptances} ${pluralize(remainingAcceptances, 'предложение', 'предложения', 'предложений')}.` : `Вы использовали все доступные принятия для этой заявки.`}`;

    const buyerLogContext = {
      platform: offer.inquiry.buyer.platform,
      userId: offer.inquiry.buyer.platformUserId,
    };
    const dealerLogContext = {
      platform: offer.dealer.platform,
      userId: offer.dealer.platformUserId,
    };

    log.info(buyerLogContext, '[Transaction] Sending buyer acceptance notification');

    const notifications: Array<Promise<unknown>> = [
      notifyBuyer(
        {
          platform: offer.inquiry.buyer.platform,
          platformChatId: offer.inquiry.buyer.platformChatId,
          platformUserId: offer.inquiry.buyer.platformUserId,
        },
        buyerMessage
      ),
    ];

    if (offer.dealer.platform && offer.dealer.platformUserId) {
      log.info(dealerLogContext, '[Transaction] Sending dealer acceptance notification');
      notifications.push(
        notifyDealerOfAcceptedOfferViaBot(
          {
            platform: offer.dealer.platform,
            platformChatId: offer.dealer.platformChatId,
            platformUserId: offer.dealer.platformUserId,
          },
          offer.inquiryId,
          offer.inquiry.model,
          offer.inquiry.submodel,
          offer.price,
          offer.inquiry.name,
          offer.inquiry.phone
        )
      );
    } else {
      log.warn(
        {
          dealerId: offer.dealerId,
          platform: offer.dealer.platform,
          hasUserId: !!offer.dealer.platformUserId,
        },
        '[Transaction] Skipping dealer notification: platform not configured'
      );
    }

    const notificationResults = await Promise.allSettled(notifications);

    const successful = notificationResults.filter(
      (r) => r.status === 'fulfilled' && (r.value as { success?: boolean })?.success !== false
    ).length;
    const failed = notificationResults.length - successful;

    log.info(
      { transactionId: transaction.id, successful, failed },
      '[Transaction] Acceptance notifications completed'
    );

    return NextResponse.json({
      id: transaction.id,
      success: true,
      transactionNumber: currentTransactionCount + 1,
      remainingAcceptances,
    });
  } catch (err) {
    if (
      typeof err === 'object' &&
      err &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Вы уже приняли предложение от этого дилера' },
        { status: 409 }
      );
    }

    captureError(err, { route: 'transactions' });
    log.error({ err }, 'transaction creation error');
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : INTERNAL_ERROR_MESSAGE,
      },
      { status: 500 }
    );
  }
});
