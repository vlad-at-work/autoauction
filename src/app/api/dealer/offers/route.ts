/**
 * Submit offer for inquiry
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import { notifyBuyerOfNewOffer } from '@/lib/notifications';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const MAX_OFFERS_PER_DEALER = 5;

const log = logger.child({ route: 'dealer/offers' });

export const POST = withLogging('dealer/offers', async (request: Request) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      log.warn({ error: validation.error }, 'invalid webapp data');
      return NextResponse.json({ error: validation.error }, { status: 401 });
    }

    const body = (await request.json()) as {
      inquiryId: string;
      price: number;
      configuration?: string;
      deliveryTime?: string;
      additionalComments?: string;
      confirmedMatch?: boolean;
    };

    const { inquiryId, price, configuration, deliveryTime, additionalComments, confirmedMatch } =
      body;

    if (!inquiryId || !price || price <= 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    if (!confirmedMatch) {
      return NextResponse.json(
        { error: 'You must confirm that the offer matches the requirements' },
        { status: 400 }
      );
    }

    const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

    const dealer = await prisma.dealer.findFirst({
      where: {
        platform: platformEnum,
        platformUserId: validation.userId,
        deletedAt: null,
        active: true,
      },
    });

    if (!dealer) {
      log.warn(
        { platform: platformEnum, userId: validation.userId },
        '[DealerOffer] Unauthorized - dealer not found'
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info(
      { dealerId: dealer.id, dealerName: dealer.name, inquiryId, price, platform: platformEnum },
      '[DealerOffer] Submitting offer'
    );

    // Check inquiry exists and is active
    const inquiry = await prisma.inquiry.findFirst({
      where: {
        id: inquiryId,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        buyer: {
          select: {
            id: true,
            platformChatId: true,
            platformUserId: true,
            platform: true,
          },
        },
      },
    });

    if (!inquiry) {
      log.warn({ inquiryId }, 'inquiry not found or expired');
      return NextResponse.json({ error: 'Inquiry not found or expired' }, { status: 404 });
    }

    // Check offer limit
    const offerCount = await prisma.offer.count({
      where: {
        inquiryId,
        dealerId: dealer.id,
        deletedAt: null,
      },
    });

    if (offerCount >= MAX_OFFERS_PER_DEALER) {
      log.warn({ dealerId: dealer.id, inquiryId, offerCount }, 'offer limit reached');
      return NextResponse.json(
        { error: `Maximum ${MAX_OFFERS_PER_DEALER} offers per inquiry` },
        { status: 400 }
      );
    }

    // Create offer
    const offer = await prisma.offer.create({
      data: {
        inquiryId,
        dealerId: dealer.id,
        price: Math.round(price),
        configuration: configuration || null,
        deliveryTime: deliveryTime || null,
        additionalComments: additionalComments || null,
        confirmedMatch: true,
        confirmedAt: new Date(),
      },
    });

    log.info(
      { offerId: offer.id, dealerId: dealer.id, inquiryId, price: Math.round(price) },
      '[DealerOffer] Offer created successfully'
    );

    // Notify buyer of new offer
    try {
      const existingOfferCount = await prisma.offer.count({
        where: {
          inquiryId,
          dealerId: dealer.id,
          deletedAt: null,
          id: { not: offer.id },
        },
      });

      const isFirstOffer = existingOfferCount === 0;
      log.info(
        {
          offerId: offer.id,
          buyerPlatform: inquiry.buyer.platform,
          buyerId: inquiry.buyer.platformUserId,
          isFirstOffer,
        },
        '[DealerOffer] Notifying buyer of new offer'
      );

      const result = await notifyBuyerOfNewOffer(
        {
          platform: inquiry.buyer.platform,
          platformChatId: inquiry.buyer.platformChatId,
          platformUserId: inquiry.buyer.platformUserId,
        },
        inquiryId,
        offer.id,
        inquiry.model,
        inquiry.submodel,
        Math.round(price),
        isFirstOffer,
        dealer.name || undefined
      );

      if (result.success) {
        log.info(
          { offerId: offer.id, buyerPlatform: inquiry.buyer.platform },
          '[DealerOffer] Buyer notification sent'
        );
      } else {
        log.error(
          { offerId: offer.id, error: result.error },
          '[DealerOffer] Failed to send buyer notification'
        );
      }
    } catch (err) {
      captureError(err, { route: 'dealer/offers', action: 'notify-buyer' });
      log.error({ offerId: offer.id, err }, '[DealerOffer] Exception sending buyer notification');
    }

    return NextResponse.json({ offer });
  } catch (err) {
    captureError(err, { route: 'dealer/offers' });
    log.error({ err }, 'error');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
});
