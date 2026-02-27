import { prisma } from '@/lib/db';

const TG_API_BASE = 'https://api.telegram.org';
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const MAX_API_BASE = 'https://platform-api.max.ru';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';

const BATCH_SIZE = 50;
const MESSAGE_LENGTH_LIMIT = 4000; // MAX limit (Telegram is 4096, MAX undocumented but safe at 4000)

async function sendTelegram(
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${TG_API_BASE}/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function sendMax(userId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${MAX_API_BASE}/messages?user_id=${userId}`, {
      method: 'POST',
      headers: { Authorization: MAX_BOT_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const message = (body.message || '').trim();

  if (!message) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  if (message.length > MESSAGE_LENGTH_LIMIT) {
    return Response.json(
      {
        error: `Message exceeds ${MESSAGE_LENGTH_LIMIT} character limit (current: ${message.length})`,
      },
      { status: 400 }
    );
  }

  const buyers = await prisma.buyer.findMany({
    where: { deletedAt: null },
    select: {
      platform: true,
      platformUserId: true,
      platformChatId: true,
      platformUserName: true,
    },
  });

  const recipients = buyers
    .map((b) => ({
      platform: b.platform,
      id: b.platform === 'TELEGRAM' ? b.platformChatId : b.platformUserId,
      name: b.platformUserName,
    }))
    .filter((r) => r.id);

  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const result =
          r.platform === 'TELEGRAM'
            ? await sendTelegram(r.id!, message)
            : await sendMax(r.id!, message);

        if (result.ok) {
          sent++;
        } else {
          errors.push(`[${r.platform}] ${r.name ?? r.id}: ${result.error}`);
        }
      })
    );

    // Count any unexpected rejections
    for (const r of results) {
      if (r.status === 'rejected') {
        errors.push(`Unexpected: ${r.reason}`);
      }
    }
  }

  return Response.json({
    sent,
    failed: errors.length,
    total: recipients.length,
    errors: errors.slice(0, 50),
  });
}
