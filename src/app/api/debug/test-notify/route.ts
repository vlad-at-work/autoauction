import { NextResponse } from 'next/server';

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;

export async function POST(request: Request) {
  const { chatId, text } = await request.json();

  console.log('test-notify called with:', { chatId, text });
  console.log('TG_BOT_TOKEN exists:', !!TG_BOT_TOKEN);
  console.log('TG_BOT_TOKEN value:', TG_BOT_TOKEN?.substring(0, 15) + '...');

  if (!TG_BOT_TOKEN) {
    return NextResponse.json({ error: 'TG_BOT_TOKEN not configured' }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    const data = await response.json();
    console.log('Telegram API response:', data);

    return NextResponse.json({ success: data.ok, data });
  } catch (err) {
    console.error('Fetch error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
