import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { notifyDealerOfLeadAccepted, notifyBuyer } from '@/lib/notifications';

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
        { error: 'Invalid request', details: parsed.error.flatten() },
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
      return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
    }

    // Verify the user owns this inquiry
    if (
      offer.inquiry.buyer.platform !== dbPlatform ||
      offer.inquiry.buyer.platformUserId !== platformUserId
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if inquiry has expired
    if (offer.inquiry.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Inquiry has expired' }, { status: 410 });
    }

    // Check if lead already exists for this offer
    if (offer.leads.length > 0) {
      return NextResponse.json({ error: 'You have already accepted this offer' }, { status: 409 });
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

    // Notify user about accepting the offer
    console.log('Sending acceptance notification to buyer:', offer.inquiry.buyer);
    notifyBuyer(
      {
        platform: offer.inquiry.buyer.platform,
        platformChatId: offer.inquiry.buyer.platformChatId,
        platformUserId: offer.inquiry.buyer.platformUserId,
      },
      `✅ Вы приняли предложение!\n\n${offer.inquiry.model} ${offer.inquiry.submodel}\nЦена: ${offer.price.toLocaleString('ru-RU')} ₽\n\nДилер скоро свяжется с вами по телефону ${offer.inquiry.phone}.`
    )
      .then((result) => {
        console.log('Buyer acceptance notification sent, result:', result);
      })
      .catch((error) => {
        console.error('Failed to notify buyer of lead acceptance:', error);
      });

    // Notify dealer about the accepted offer (async, don't block response)
    notifyDealerOfLeadAccepted(
      offer.dealer,
      offer.inquiry.model,
      offer.inquiry.submodel,
      offer.price,
      offer.inquiry.name,
      offer.inquiry.phone
    ).catch((error) => {
      console.error('Failed to notify dealer of lead:', error);
    });

    return NextResponse.json({ id: lead.id, success: true });
  } catch (err) {
    console.error('Lead creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
