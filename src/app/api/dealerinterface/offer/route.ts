import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { validateSessionToken } from '@/lib/auth/dealer-auth';
import { notifyBuyerOfNewOffer } from '@/lib/notifications';

const MAX_OFFERS_PER_DEALER_PER_INQUIRY = 5;

const offerCreateSchema = z.object({
  inquiryId: z.string().min(1),
  price: z.number().int().positive().max(2147483647),
  comment: z.string().max(1000).optional(),
});

/**
 * Create an offer from the authenticated dealer (mini-app)
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session token from cookie
    const sessionToken = request.cookies.get('dealer_session')?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const session = validateSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Недействительная сессия' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = offerCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректный запрос', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { inquiryId, price, comment } = parsed.data;

    // Verify dealer exists and is active
    const dealer = await prisma.dealer.findUnique({
      where: { id: session.dealerId },
      select: { id: true, active: true },
    });

    if (!dealer || !dealer.active) {
      // Clear invalid session cookie and return 401 to force re-auth
      const response = NextResponse.json(
        { error: 'Дилер не найден или неактивен' },
        { status: 401 }
      );
      response.cookies.set('dealer_session', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
      });
      return response;
    }

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

    // Check if this dealer already has a transaction on this inquiry
    const existingTransaction = await prisma.transaction.findUnique({
      where: { inquiryId_dealerId: { inquiryId, dealerId: dealer.id } },
    });

    if (existingTransaction) {
      return NextResponse.json(
        { error: 'Ваше предложение уже принято. Новые предложения не принимаются.' },
        { status: 409 }
      );
    }

    // Check how many offers this dealer has already made
    const existingOfferCount = await prisma.offer.count({
      where: { inquiryId, dealerId: dealer.id, deletedAt: null },
    });

    if (existingOfferCount >= MAX_OFFERS_PER_DEALER_PER_INQUIRY) {
      return NextResponse.json(
        { error: `Достигнут лимит предложений (${MAX_OFFERS_PER_DEALER_PER_INQUIRY}).` },
        { status: 409 }
      );
    }

    const offer = await prisma.offer.create({
      data: { inquiryId, dealerId: dealer.id, price, comment, deletedAt: null },
      select: { id: true },
    });

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
        console.error('Failed to send buyer notification:', result.error);
      }
    } catch (err) {
      console.error('Failed to send buyer notification:', err);
    }

    return NextResponse.json({
      id: offer.id,
      offerNumber: existingOfferCount + 1,
      remainingOffers: MAX_OFFERS_PER_DEALER_PER_INQUIRY - existingOfferCount - 1,
    });
  } catch (err) {
    console.error('[/api/dealerinterface/offer] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
