/**
 * Get a single inquiry by ID for authenticated dealer.
 * Returns inquiry details, the dealer's own offers, anonymized competing offers,
 * and any transaction (accepted offer) belonging to this dealer.
 */

import { NextResponse } from 'next/server';

import { INTERNAL_ERROR_MESSAGE } from '@/lib/errors';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { prisma } from '@/lib/db';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const MAX_OFFERS_PER_DEALER = 5;

const log = logger.child({ route: 'dealer/inquiries/[id]' });

export const GET = withLogging(
  'dealer/inquiries/[id]',
  async (request: Request, context: unknown) => {
    try {
      const { id } = await (context as { params: Promise<{ id: string }> }).params;
      const authHeader = request.headers.get('Authorization');
      const validation = validateWebAppRequest(authHeader, 'dealer');

      if (!validation.valid) {
        return NextResponse.json({ error: validation.error }, { status: 401 });
      }

      const platformEnum = validation.platform === 'max' ? 'MAX' : 'TELEGRAM';

      const dealer = await prisma.dealer.findFirst({
        where: {
          platform: platformEnum,
          platformUserId: validation.userId,
          deletedAt: null,
          active: true,
        },
        select: { id: true },
      });

      if (!dealer) {
        return NextResponse.json({ error: 'Дилер не найден' }, { status: 404 });
      }

      const inquiry = await prisma.inquiry.findFirst({
        where: { id, deletedAt: null },
        include: {
          offers: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              price: true,
              configuration: true,
              deliveryTime: true,
              additionalComments: true,
              confirmedMatch: true,
              dealerId: true,
              createdAt: true,
              transaction: {
                select: {
                  id: true,
                  acceptedAt: true,
                },
              },
            },
          },
          transactions: {
            where: { dealerId: dealer.id },
            select: {
              id: true,
              dealerId: true,
              buyerName: true,
              buyerEmail: true,
              buyerPhone: true,
              acceptedAt: true,
              buyerPlatform: true,
              buyerPlatformUserId: true,
              buyerPlatformHandle: true,
            },
          },
          _count: {
            select: { transactions: true },
          },
        },
      });

      if (!inquiry) {
        return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
      }

      const myOffers = inquiry.offers.filter((o) => o.dealerId === dealer.id);
      const otherOffers = inquiry.offers.filter((o) => o.dealerId !== dealer.id);
      const myTransaction = inquiry.transactions.find((t) => t.dealerId === dealer.id) || null;

      const canMakeOffer =
        inquiry.expiresAt > new Date() && !myTransaction && myOffers.length < MAX_OFFERS_PER_DEALER;

      return NextResponse.json({
        inquiry: {
          id: inquiry.id,
          model: inquiry.model,
          submodel: inquiry.submodel,
          transmission: inquiry.transmission,
          color: inquiry.color,
          comment: inquiry.comment,
          expiresAt: inquiry.expiresAt,
          transactionCount: inquiry._count.transactions,
        },
        myOffers,
        otherOffers,
        myTransaction,
        canMakeOffer,
        remainingOffers: MAX_OFFERS_PER_DEALER - myOffers.length,
        dealerId: dealer.id,
      });
    } catch (err) {
      captureError(err, { route: 'dealer/inquiries/[id]' });
      log.error({ err }, 'error');
      return NextResponse.json({ error: INTERNAL_ERROR_MESSAGE }, { status: 500 });
    }
  }
);
