import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';
import { inquiryCreateSchema } from '@/lib/schemas/inquiry';
import { getActiveHardcodedDealers } from '@/lib/hardcoded-dealers';
import { notifyDealerOfNewInquiry, notifyBuyer } from '@/lib/notifications';

const MAX_INQUIRIES_PER_MONTH = 2;
const INQUIRY_LIMIT_RESET_DAYS = 15;

/**
 * Check if buyer's inquiry limit should be reset and update if needed
 * Returns the updated buyer with current limit info
 */
async function checkAndResetInquiryLimit(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  buyerId: string
) {
  const buyer = await tx.buyer.findUnique({
    where: { id: buyerId },
    select: {
      id: true,
      inquiriesUsedThisMonth: true,
      inquiryLimitResetAt: true,
    },
  });

  if (!buyer) return null;

  const now = new Date();
  const resetAt = new Date(buyer.inquiryLimitResetAt);

  // Check if we need to reset (15 days passed since last reset)
  if (now >= resetAt) {
    // Calculate next reset date (15 days from now)
    const nextReset = new Date(now.getTime() + INQUIRY_LIMIT_RESET_DAYS * 24 * 60 * 60 * 1000);

    const updated = await tx.buyer.update({
      where: { id: buyerId },
      data: {
        inquiriesUsedThisMonth: 0,
        inquiryLimitResetAt: nextReset,
      },
      select: {
        id: true,
        inquiriesUsedThisMonth: true,
        inquiryLimitResetAt: true,
      },
    });

    return updated;
  }

  return buyer;
}

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
    const authUserId = validation.userId;
    const authPlatform = validation.platform;

    const body = await request.json();
    const parsed = inquiryCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Некорректный запрос',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    if (input.platformUserId !== authUserId) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    if (input.platform !== authPlatform) {
      return NextResponse.json({ error: 'Нет доступа' }, { status: 403 });
    }

    const platform = authPlatform === 'max' ? 'MAX' : 'TELEGRAM';

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await prisma.$transaction(async (tx) => {
      // Upsert buyer first
      const buyer = await tx.buyer.upsert({
        where: {
          platform_platformUserId: {
            platform,
            platformUserId: authUserId,
          },
        },
        update: {
          platformUserName: input.platformUserName,
          deletedAt: null,
          // Update chat_id if provided (may change between sessions)
          ...(input.platformChatId && { platformChatId: input.platformChatId }),
        },
        create: {
          platform,
          platformUserId: authUserId,
          platformChatId: input.platformChatId,
          platformUserName: input.platformUserName,
          inquiriesUsedThisMonth: 0,
          inquiryLimitResetAt: new Date(
            Date.now() + INQUIRY_LIMIT_RESET_DAYS * 24 * 60 * 60 * 1000
          ),
          deletedAt: null,
        },
      });

      // Check and potentially reset inquiry limit
      const buyerWithLimit = await checkAndResetInquiryLimit(tx, buyer.id);
      if (!buyerWithLimit) {
        throw new Error('Buyer not found after creation');
      }

      // Check if user has reached their monthly inquiry limit
      if (buyerWithLimit.inquiriesUsedThisMonth >= MAX_INQUIRIES_PER_MONTH) {
        const resetDate = new Date(buyerWithLimit.inquiryLimitResetAt);
        const daysUntilReset = Math.ceil(
          (resetDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );

        return {
          success: false,
          error: 'INQUIRY_LIMIT_REACHED',
          message: `Вы исчерпали лимит заявок (${MAX_INQUIRIES_PER_MONTH} в месяц). Новая заявка будет доступна через ${daysUntilReset} дн.`,
          remainingInquiries: 0,
          nextInquiryAt: resetDate.toISOString(),
        };
      }

      // Create the inquiry
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
          deletedAt: null,
        },
        select: { id: true },
      });

      // Increment the used inquiries count
      const updatedBuyer = await tx.buyer.update({
        where: { id: buyer.id },
        data: {
          inquiriesUsedThisMonth: { increment: 1 },
        },
        select: {
          id: true,
          platform: true,
          platformUserId: true,
          platformChatId: true,
          inquiriesUsedThisMonth: true,
          inquiryLimitResetAt: true,
        },
      });

      return {
        success: true,
        inquiry: newInquiry,
        buyer: updatedBuyer,
        remainingInquiries: MAX_INQUIRIES_PER_MONTH - updatedBuyer.inquiriesUsedThisMonth,
      };
    });

    // If limit was reached, return error response
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.message,
          code: result.error,
          remainingInquiries: result.remainingInquiries,
          nextInquiryAt: result.nextInquiryAt,
        },
        { status: 429 }
      );
    }

    // TypeScript narrowing: after checking success, buyer and inquiry are guaranteed
    const inquiry = result.inquiry!;
    const buyer = result.buyer!;
    const remainingInquiries = result.remainingInquiries!;
    // Notify buyer and dealers
    const dealers = getActiveHardcodedDealers();

    const remainingText =
      remainingInquiries > 0
        ? `\n\n📋 Осталось заявок: ${remainingInquiries} из ${MAX_INQUIRIES_PER_MONTH}`
        : `\n\n⚠️ Это была ваша последняя заявка в этом периоде.`;

    // IMPORTANT: await notifications to avoid serverless "fire-and-forget" drops.
    await Promise.allSettled([
      notifyBuyer(
        {
          platform: buyer.platform,
          platformChatId: buyer.platformChatId,
          platformUserId: buyer.platformUserId,
        },
        `✅ Заявка создана!\n\n${input.model} ${input.submodel}\n${input.transmission} • ${input.color}\n\nДилеры начнут присылать вам предложения. Заявка активна 24 часа.${remainingText}`
      ),
      ...dealers.map((dealer) =>
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
        )
      ),
    ]);

    return NextResponse.json({
      id: inquiry.id,
      success: true,
      remainingInquiries,
      nextInquiryAt: buyer.inquiryLimitResetAt,
    });
  } catch (err) {
    console.error('Inquiry creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
