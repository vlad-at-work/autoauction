// Test the exact same notification call the API makes
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string) {
  if (!TG_BOT_TOKEN) {
    console.error('TG_BOT_TOKEN not set');
    return { success: false, error: 'TG_BOT_TOKEN not configured' };
  }

  console.log('Sending to chatId:', chatId);
  console.log('Token:', TG_BOT_TOKEN?.substring(0, 10) + '...');

  const response = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  });

  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  return { success: data.ok, error: data.description };
}

async function main() {
  const result = await sendTelegramMessage('478130318', '🔔 Test notification from script');
  console.log('Result:', result);
}

main();
