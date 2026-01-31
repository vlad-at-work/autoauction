import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { sendMaxMessage } from '@/lib/notifications/max';

const querySchema = z.object({
  chatId: z.string().min(1).optional(),
  text: z.string().min(1).max(2000).optional(),
});

function isDebugSendEnabled(): boolean {
  if (process.env.DEBUG_MAX_TEST_MESSAGE_ENABLED === 'true') return true;
  const vercelEnv = process.env.VERCEL_ENV;
  return (
    vercelEnv === 'preview' || vercelEnv === 'development' || process.env.NODE_ENV !== 'production'
  );
}

export async function GET(request: Request) {
  if (!isDebugSendEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Отладочная отправка выключена (включите DEBUG_MAX_TEST_MESSAGE_ENABLED=true)',
      },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    chatId: url.searchParams.get('chatId') ?? undefined,
    text: url.searchParams.get('text') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректный запрос', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const fallbackBuyer = await prisma.buyer.findFirst({
      where: { platform: 'MAX' },
      orderBy: { createdAt: 'desc' },
      select: { platformChatId: true, platformUserId: true },
    });

    const chatId =
      parsed.data.chatId ?? fallbackBuyer?.platformChatId ?? fallbackBuyer?.platformUserId;

    if (!chatId) {
      return NextResponse.json(
        { success: false, error: 'Не найден chat_id MAX покупателя (передайте ?chatId=...)' },
        { status: 404 }
      );
    }

    const text =
      parsed.data.text ??
      `ping ${new Date().toISOString()} ${Math.random().toString(16).slice(2, 6)}`;

    const result = await sendMaxMessage(chatId, text);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Не удалось отправить сообщение' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, chatId, text });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
