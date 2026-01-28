import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { inquiryCreateSchema } from '@/lib/schemas/inquiry';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = inquiryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const platform = input.platform === 'max' ? 'MAX' : 'TELEGRAM';

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const inquiry = await prisma.$transaction(async (tx) => {
      const buyer = await tx.buyer.upsert({
        where: {
          platform_platformUserId: {
            platform,
            platformUserId: input.platformUserId,
          },
        },
        update: {
          platformUserName: input.platformUserName,
        },
        create: {
          platform,
          platformUserId: input.platformUserId,
          platformUserName: input.platformUserName,
        },
      });

      return tx.inquiry.create({
        data: {
          buyerId: buyer.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          status: input.status,
          statusDescription: input.statusDescription,
          model: input.model,
          submodel: input.submodel,
          transmission: input.transmission,
          color: input.color,
          comment: input.comment,
          expiresAt,
        },
        select: { id: true },
      });
    });

    return NextResponse.json(inquiry);
  } catch (err) {
    console.error('Inquiry creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
