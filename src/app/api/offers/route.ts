import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { parseBasicAuthHeader } from '@/lib/auth/basic';
import { notifyBuyerOfNewOffer } from '@/lib/notifications';

const offerUpsertSchema = z.object({
  inquiryId: z.string().min(1),
  price: z.number().int().positive(),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const auth = parseBasicAuthHeader(request.headers.get('authorization'));
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = offerUpsertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { inquiryId, price, comment } = parsed.data;

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
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
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    if (inquiry.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Inquiry expired' }, { status: 410 });
    }

    const dealer = await prisma.dealer.upsert({
      where: { username: auth.username },
      update: {},
      create: { username: auth.username },
      select: { id: true },
    });

    const existing = await prisma.offer.findUnique({
      where: { inquiryId_dealerId: { inquiryId, dealerId: dealer.id } },
      select: { id: true, leads: { select: { id: true }, take: 1 } },
    });

    if (existing && existing.leads.length > 0) {
      return NextResponse.json({ error: 'Offer already accepted' }, { status: 409 });
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Offer already submitted (waiting for buyer confirmation)' },
        { status: 409 }
      );
    }

    const offer = await prisma.offer.create({
      data: { inquiryId, dealerId: dealer.id, price, comment },
      select: { id: true },
    });

    // Send notification to buyer
    console.log('Sending notification to buyer:', inquiry.buyer);
    notifyBuyerOfNewOffer(
      inquiry.buyer,
      inquiryId,
      offer.id,
      inquiry.model,
      inquiry.submodel,
      price
    )
      .then((result) => {
        console.log('Notification sent, result:', result);
      })
      .catch((err) => {
        console.error('Failed to send notification:', err);
      });

    return NextResponse.json(offer);
  } catch (err) {
    if (
      typeof err === 'object' &&
      err &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Offer already submitted (waiting for buyer confirmation)' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
