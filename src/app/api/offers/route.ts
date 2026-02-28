import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { parseBasicAuthHeader } from '@/lib/auth/basic';
import { notifyBuyerOfNewOffer } from '@/lib/notifications';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const MAX_OFFERS_PER_DEALER_PER_INQUIRY = 5;

const log = logger.child({ route: 'offers' });

const offerCreateSchema = z.object({
  inquiryId: z.string().min(1),
  price: z.number().int().positive().max(2147483647), // INT4 max
  configuration: z.string().max(500).optional(),
  deliveryTime: z.string().max(200).optional(),
  additionalComments: z.string().max(1000).optional(),
  confirmedMatch: z.boolean().default(false),
});

export const POST = withLogging('offers', async (request: Request) => {
  const auth = parseBasicAuthHeader(request.headers.get('authorization'));
  if (!auth) {
    return NextResponse.json({ error: 'Неавторизован' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = offerCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректный запрос', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { inquiryId, price, configuration, deliveryTime, additionalComments, confirmedMatch } =
      parsed.data;

    const inquiry = await prisma.inquiry.findFirst({
      where: { id: inquiryId, deletedAt: null },
      select: {
        expiresAt: true,
        model: true,
        submodel: true,
        buyer: {
          select: {
            platform: true,
            platformUserId: true,
            platformChatId: true,
          },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
    }

    if (inquiry.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Заявка истекла' }, { status: 410 });
    }

    const dealer = await prisma.dealer.findFirst({
      where: { username: auth.username, deletedAt: null },
      select: { id: true, active: true },
    });

    if (!dealer) {
      return NextResponse.json(
        { error: 'Дилер не зарегистрирован. Обратитесь к администратору.' },
        { status: 403 }
      );
    }

    if (!dealer.active) {
      return NextResponse.json({ error: 'Дилер неактивен' }, { status: 403 });
    }

    // Check if this dealer already has a transaction on this inquiry (offer accepted)
    const existingTransaction = await prisma.transaction.findUnique({
      where: { inquiryId_dealerId: { inquiryId, dealerId: dealer.id } },
    });

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Ваше предложение уже принято покупателем. Новые предложения не принимаются.' },
        { status: 409 }
      );
    }

    // Check how many offers this dealer has already made on this inquiry
    const existingOfferCount = await prisma.offer.count({
      where: { inquiryId, dealerId: dealer.id, deletedAt: null },
    });

    if (existingOfferCount >= MAX_OFFERS_PER_DEALER_PER_INQUIRY) {
      return NextResponse.json(
        {
          error: `Достигнут лимит предложений (${MAX_OFFERS_PER_DEALER_PER_INQUIRY}). Дождитесь решения покупателя.`,
        },
        { status: 409 }
      );
    }

    const offer = await prisma.offer.create({
      data: {
        inquiryId,
        dealerId: dealer.id,
        price,
        configuration,
        deliveryTime,
        additionalComments,
        confirmedMatch,
        deletedAt: null,
      },
      select: { id: true },
    });

    log.info(
      { offerId: offer.id, dealerId: dealer.id, inquiryId, price },
      'offer created (basic auth)'
    );

    // Send notification to buyer
    try {
      const isFirstOffer = existingOfferCount === 0;
      const result = await notifyBuyerOfNewOffer(
        inquiry.buyer,
        inquiryId,
        offer.id,
        inquiry.model,
        inquiry.submodel,
        price,
        isFirstOffer
      );
      if (!result.success) {
        log.error({ error: result.error }, 'failed to send buyer notification');
      }
    } catch (err) {
      captureError(err, { route: 'offers', action: 'notify-buyer' });
      log.error({ err }, 'failed to send buyer notification');
    }

    return NextResponse.json({
      id: offer.id,
      offerNumber: existingOfferCount + 1,
      remainingOffers: MAX_OFFERS_PER_DEALER_PER_INQUIRY - existingOfferCount - 1,
    });
  } catch (err) {
    captureError(err, { route: 'offers' });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
});
