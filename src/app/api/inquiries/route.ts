import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { inquiryCreateSchema } from '@/lib/schemas/inquiry';
import { getActiveHardcodedDealers } from '@/lib/hardcoded-dealers';
import { notifyDealerOfNewInquiry, notifyBuyer } from '@/lib/notifications';

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
          // Update chat_id if provided (may change between sessions)
          ...(input.platformChatId && { platformChatId: input.platformChatId }),
        },
        create: {
          platform,
          platformUserId: input.platformUserId,
          platformChatId: input.platformChatId,
          platformUserName: input.platformUserName,
        },
      });

      const newInquiry = await tx.inquiry.create({
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

      return { ...newInquiry, buyer };
    });

    // Notify user that inquiry was created
    const userNotificationPromise = notifyBuyer(
      {
        platform: inquiry.buyer.platform,
        platformChatId: inquiry.buyer.platformChatId,
        platformUserId: inquiry.buyer.platformUserId,
      },
      `✅ Заявка создана!\n\n${input.model} ${input.submodel}\n${input.transmission} • ${input.color}\n\nДилеры начнут присылать вам предложения. Заявка активна 24 часа.`
    ).catch((error) => {
      console.error('Failed to notify buyer:', error);
      return { success: false };
    });

    // Notify all active hardcoded dealers about the new inquiry
    const dealers = getActiveHardcodedDealers();
    const dealerNotificationPromises = dealers.map((dealer) =>
      notifyDealerOfNewInquiry(
        {
          platform: dealer.platform,
          platformChatId: dealer.platformChatId,
          platformUserId: dealer.platformUserId,
        },
        inquiry.id,
        input.model,
        input.submodel,
        input.transmission,
        input.color
      ).catch((error) => {
        // Log error but don't fail the request
        console.error(`Failed to notify dealer ${dealer.username}:`, error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      })
    );

    // Send all notifications in parallel without blocking the response
    Promise.all([userNotificationPromise, ...dealerNotificationPromises]).catch((error) => {
      console.error('Failed to send notifications:', error);
    });

    return NextResponse.json({ id: inquiry.id, success: true });
  } catch (err) {
    console.error('Inquiry creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
