/**
 * Submit offer for inquiry
 *
 * Body: {
 *   inquiryId: string,
 *   price: number,
 *   configuration?: string,
 *   deliveryTime?: string,
 *   additionalComments?: string,
 *   confirmedMatch: boolean
 * }
 *
 * Validates:
 * - Dealer is authenticated and active
 * - Inquiry exists and is active
 * - Dealer hasn't exceeded offer limit (5 per inquiry)
 * - confirmedMatch must be true
 */

import { NextResponse } from 'next/server';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import { notifyBuyerOfNewOffer } from '@/lib/notifications';

const MAX_OFFERS_PER_DEALER = 5;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    const validation = validateWebAppRequest(authHeader, 'dealer');

    if (!validation.valid) {
      console.error('[/api/dealer/offers] Invalid WebApp data:', validation.error);
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

    if (!dealer || !dealer.passwordHash) {
      console.warn('[/api/dealer/offers] Unauthorized - dealer not found or not set up');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.warn('[/api/dealer/offers] Submitting offer:', {
      dealerId: dealer.id,
      inquiryId,
      price,
    });

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
      console.warn('[/api/dealer/offers] Inquiry not found or expired');
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
      console.warn('[/api/dealer/offers] Offer limit reached');
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

    console.warn('[/api/dealer/offers] Offer created:', offer.id);

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
        existingOfferCount === 0,
        dealer.name || undefined
      );

      if (!result.success) {
        console.error('Failed to send buyer notification:', result.error);
      }
    } catch (err) {
      console.error('Failed to send buyer notification:', err);
    }

    return NextResponse.json({ offer });
  } catch (err) {
    console.error('[/api/dealer/offers] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
