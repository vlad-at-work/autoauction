import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { notifyDealerOfTransactionAccepted, notifyBuyer } from '@/lib/notifications';

const MAX_TRANSACTIONS_PER_INQUIRY = 3;

function formatPhoneRU(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
  }
  return phone;
}

const transactionCreateSchema = z.object({
  offerId: z.string().min(1),
});

export async function POST(request: Request) {
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

    // Get offer with inquiry and buyer info
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

    // Verify the user owns this inquiry
    if (
      offer.inquiry.buyer.platform !== dbPlatform ||
      offer.inquiry.buyer.platformUserId !== validation.userId
    ) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Check if inquiry has expired
    if (offer.inquiry.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Заявка истекла' }, { status: 410 });
    }

    // Check if this specific offer already has a transaction
    if (offer.transaction) {
      return NextResponse.json({ error: 'Вы уже приняли это предложение' }, { status: 409 });
    }

    // Check if this dealer already has a transaction for this inquiry
    const existingDealerTransaction = offer.inquiry.transactions.find(
      (t) => t.dealerId === offer.dealerId
    );
    if (existingDealerTransaction) {
      return NextResponse.json(
        { error: 'Вы уже приняли предложение от этого дилера' },
        { status: 409 }
      );
    }

    // Check if inquiry has reached the transaction cap
    const currentTransactionCount = offer.inquiry.transactions.length;
    if (currentTransactionCount >= MAX_TRANSACTIONS_PER_INQUIRY) {
      return NextResponse.json(
        {
          error: `Достигнут лимит принятых предложений (${MAX_TRANSACTIONS_PER_INQUIRY}). Свяжитесь с выбранными дилерами.`,
        },
        { status: 409 }
      );
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        inquiryId: offer.inquiryId,
        offerId,
        dealerId: offer.dealerId,
        buyerName: offer.inquiry.name,
        buyerEmail: offer.inquiry.email,
        buyerPhone: offer.inquiry.phone,
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

    // Send notifications
    const formattedPhone = formatPhoneRU(offer.inquiry.phone);
    const dealerName = offer.dealer.name || offer.dealer.username;
    const remainingAcceptances = MAX_TRANSACTIONS_PER_INQUIRY - currentTransactionCount - 1;

    const buyerMessage = `🎉 Поздравляем! Вы приняли предложение от ${dealerName}!

🚗 ${offer.inquiry.model} ${offer.inquiry.submodel}
💰 Цена: ${offer.price.toLocaleString('ru-RU')} ₽

Дилер скоро свяжется с вами по номеру ${formattedPhone}.

${remainingAcceptances > 0 ? `📋 Вы можете принять ещё ${remainingAcceptances} предложение${remainingAcceptances === 1 ? '' : remainingAcceptances < 5 ? 'я' : 'ий'}.` : '✅ Вы использовали все доступные принятия для этой заявки.'}`;

    // eslint-disable-next-line no-console
    console.log('Sending acceptance notification to buyer:', offer.inquiry.buyer);

    // IMPORTANT: await notifications to avoid serverless "fire-and-forget" drops.
    await Promise.allSettled([
      notifyBuyer(
        {
          platform: offer.inquiry.buyer.platform,
          platformChatId: offer.inquiry.buyer.platformChatId,
          platformUserId: offer.inquiry.buyer.platformUserId,
        },
        buyerMessage
      ),
      notifyDealerOfTransactionAccepted(
        offer.dealer,
        offer.inquiry.model,
        offer.inquiry.submodel,
        offer.price,
        offer.inquiry.name,
        offer.inquiry.phone
      ),
    ]);

    return NextResponse.json({
      id: transaction.id,
      success: true,
      transactionNumber: currentTransactionCount + 1,
      remainingAcceptances,
    });
  } catch (err) {
    // Handle unique constraint violation (dealer already has transaction for this inquiry)
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

    console.error('Transaction creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
