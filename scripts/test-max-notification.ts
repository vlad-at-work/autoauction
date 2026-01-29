/**
 * Test script to send a MAX notification
 * Usage: bun run scripts/test-max-notification.ts <chat_id>
 */

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_API_BASE = 'https://platform-api.max.ru';

async function sendMaxMessage(chatId: string, text: string) {
  if (!MAX_BOT_TOKEN || MAX_BOT_TOKEN === '<from_vercel>') {
    console.error('❌ MAX_BOT_TOKEN not configured');
    console.log('Please set MAX_BOT_TOKEN in .env.local');
    return;
  }

  console.log('📤 Sending message to MAX...');
  console.log('Chat ID:', chatId);
  console.log('Text:', text);

  try {
    const response = await fetch(`${MAX_API_BASE}/messages`, {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: parseInt(chatId, 10),
        text,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Failed to send message');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(data, null, 2));
      return;
    }

    console.log('✅ Message sent successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('❌ Error:', err instanceof Error ? err.message : err);
  }
}

// Get chat_id from command line
const chatId = process.argv[2];

if (!chatId) {
  console.error('Usage: bun run scripts/test-max-notification.ts <chat_id>');
  console.log('\nTo get your chat_id:');
  console.log('1. Open the MAX mini-app');
  console.log('2. Check the browser console for initDataUnsafe.chat.id');
  console.log('3. Or check the database for your Buyer record');
  process.exit(1);
}

sendMaxMessage(chatId, 'Тестовое уведомление из AutoAuction! 🚗');
