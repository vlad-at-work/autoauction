import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { captureError } from '@/lib/hawk';
import { logger, withLogging } from '@/lib/logger';

const MAX_TRANSACTIONS_PER_INQUIRY = 3;

const log = logger.child({ route: 'inquiries/[id]' });

export const GET = withLogging('inquiries/[id]', async (request: Request, context: unknown) => {
  try {
    const { id } = await (context as { params: Promise<{ id: string }> }).params;
    const authHeader = request.headers.get('authorization');
    const validation = validateWebAppRequest(authHeader);
    if (!validation.valid || !validation.userId) {
      return NextResponse.json(
        { error: 'Неавторизованно: ' + (validation.error || 'unknown error') },
        { status: 401 }
      );
    }

    const inquiry = await prisma.inquiry.findFirst({
      where: { id, deletedAt: null },
      include: {
        buyer: {
          select: {
            platformUserId: true,
          },
        },
        offers: {
          where: {
            deletedAt: null,
            dealer: { deletedAt: null },
          },
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            dealer: {
              select: {
                id: true,
                username: true,
                name: true,
                subName: true,
              },
            },
            transaction: {
              select: {
                id: true,
                acceptedAt: true,
              },
            },
          },
        },
        transactions: {
          select: {
            id: true,
            dealerId: true,
            acceptedAt: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Заявка не найдена' }, { status: 404 });
    }

    if (inquiry.buyer.platformUserId !== validation.userId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { buyer, ...inquiryData } = inquiry;

    const dealerOffersMap = new Map<
      string,
      {
        dealerId: string;
        dealerName: string;
        offers: {
          id: string;
          price: number;
          configuration: string | null;
          deliveryTime: string | null;
          additionalComments: string | null;
          createdAt: Date;
          isAccepted: boolean;
          transactionId: string | null;
        }[];
        hasTransaction: boolean;
      }
    >();

    for (const offer of inquiryData.offers) {
      const dealerId = offer.dealer.id;
      const dealerName = offer.dealer.name || offer.dealer.username;

      if (!dealerOffersMap.has(dealerId)) {
        dealerOffersMap.set(dealerId, {
          dealerId,
          dealerName,
          offers: [],
          hasTransaction: inquiry.transactions.some((t) => t.dealerId === dealerId),
        });
      }

      dealerOffersMap.get(dealerId)!.offers.push({
        id: offer.id,
        price: offer.price,
        configuration: offer.configuration,
        deliveryTime: offer.deliveryTime,
        additionalComments: offer.additionalComments,
        createdAt: offer.createdAt,
        isAccepted: !!offer.transaction,
        transactionId: offer.transaction?.id || null,
      });
    }

    const offersByDealer = Array.from(dealerOffersMap.values()).sort((a, b) => {
      const aLatest = a.offers[0]?.createdAt || new Date(0);
      const bLatest = b.offers[0]?.createdAt || new Date(0);
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    const flatOffers = inquiryData.offers.map((offer) => ({
      id: offer.id,
      price: offer.price,
      configuration: offer.configuration,
      deliveryTime: offer.deliveryTime,
      additionalComments: offer.additionalComments,
      createdAt: offer.createdAt,
      dealerId: offer.dealer.id,
      dealerName: offer.dealer.name || offer.dealer.username,
      isAccepted: !!offer.transaction,
      transactionId: offer.transaction?.id || null,
    }));

    const transactionCount = inquiry._count.transactions;
    const remainingAcceptances = MAX_TRANSACTIONS_PER_INQUIRY - transactionCount;

    const transformedInquiry = {
      ...inquiryData,
      offers: flatOffers,
      offersByDealer,
      transactions: inquiry.transactions,
      _count: {
        offers: flatOffers.length,
        transactions: inquiry._count.transactions,
      },
      acceptanceLimits: {
        used: transactionCount,
        max: MAX_TRANSACTIONS_PER_INQUIRY,
        remaining: remainingAcceptances,
      },
    };

    return NextResponse.json(transformedInquiry);
  } catch (error) {
    captureError(error, { route: 'inquiries/[id]' });
    log.error({ err: error }, 'error');
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Что-то пошло не так. Мы уже работаем над этим.',
      },
      { status: 500 }
    );
  }
});
