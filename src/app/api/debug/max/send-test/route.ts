import { NextResponse } from 'next/server';
import { z } from 'zod';

import { sendMaxMessage } from '@/lib/notifications/max';

const bodySchema = z.object({
  chatId: z.string().min(1),
  text: z.string().min(1).max(2000).optional(),
});

function isDebugSendEnabled(): boolean {
  if (process.env.DEBUG_MAX_TEST_MESSAGE_ENABLED === 'true') return true;
  const vercelEnv = process.env.VERCEL_ENV;
  return (
    vercelEnv === 'preview' || vercelEnv === 'development' || process.env.NODE_ENV !== 'production'
  );
}

export async function POST(request: Request) {
  if (!isDebugSendEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Отладочная отправка выключена (включите DEBUG_MAX_TEST_MESSAGE_ENABLED=true)',
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Некорректный запрос', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { chatId, text } = parsed.data;
    const result = await sendMaxMessage(chatId, text ?? 'hello 12345 - super check');

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error ?? 'Не удалось отправить сообщение' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Внутренняя ошибка' },
      { status: 500 }
    );
  }
}
