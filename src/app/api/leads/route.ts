import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { notifyDealerOfLeadAccepted, notifyBuyer } from '@/lib/notifications';

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

const leadCreateSchema = z.object({
  offerId: z.string().min(1),
  platform: z.enum(['max', 'telegram']),
  platformUserId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = leadCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректный запрос', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { offerId, platform, platformUserId } = parsed.data;
    const dbPlatform = platform === 'max' ? 'MAX' : 'TELEGRAM';

    // Get offer with inquiry and buyer info
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        inquiry: {
          include: {
            buyer: true,
          },
        },
        dealer: true,
        leads: true,
      },
    });

    if (!offer) {
      return NextResponse.json({ error: 'Предложение не найдено' }, { status: 404 });
    }

    // Verify the user owns this inquiry
    if (
      offer.inquiry.buyer.platform !== dbPlatform ||
      offer.inquiry.buyer.platformUserId !== platformUserId
    ) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    // Check if inquiry has expired
    if (offer.inquiry.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Заявка истекла' }, { status: 410 });
    }

    // Check if lead already exists for this offer
    if (offer.leads.length > 0) {
      return NextResponse.json({ error: 'Вы уже приняли это предложение' }, { status: 409 });
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        offerId,
        buyerName: offer.inquiry.name,
        buyerEmail: offer.inquiry.email,
        buyerPhone: offer.inquiry.phone,
      },
    });

    // Notify user about accepting the offer with full debug dump
    const formattedPhone = formatPhoneRU(offer.inquiry.phone);
    const dealerName = offer.dealer.name || offer.dealer.username;
    const debugDump = `🎉 Поздравляем! Ваша скидка от ${dealerName} активирована!

🚗 ${offer.inquiry.model} ${offer.inquiry.submodel}
💰 Цена: ${offer.price.toLocaleString('ru-RU')} ₽

Дилер скоро свяжется с вами по номеру ${formattedPhone}.

📋 Детали вашей заявки:
• Имя: ${offer.inquiry.name}
• Телефон: ${formattedPhone}
• Эл. почта: ${offer.inquiry.email || 'не указана'}
• Коробка: ${offer.inquiry.transmission}
• Цвет: ${offer.inquiry.color}

Спасибо, что выбрали нас! 🙌`;

    console.log('Sending acceptance notification to buyer:', offer.inquiry.buyer);
    // IMPORTANT: await notifications to avoid serverless "fire-and-forget" drops.
    await Promise.allSettled([
      notifyBuyer(
        {
          platform: offer.inquiry.buyer.platform,
          platformChatId: offer.inquiry.buyer.platformChatId,
          platformUserId: offer.inquiry.buyer.platformUserId,
        },
        debugDump
      ),
      notifyDealerOfLeadAccepted(
        offer.dealer,
        offer.inquiry.model,
        offer.inquiry.submodel,
        offer.price,
        offer.inquiry.name,
        offer.inquiry.phone
      ),
    ]);

    return NextResponse.json({ id: lead.id, success: true });
  } catch (err) {
    console.error('Lead creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
