/**
 * Test script to send a MAX notification
 * Usage: bun run scripts/test-max-notification.ts <chat_id> [text]
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
    const url = new URL(`${MAX_API_BASE}/messages`);
    url.searchParams.set('chat_id', chatId);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
      }),
    });

    const data = await response.json().catch(() => ({}));

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

// Get chat_id from command line (or env for convenience)
const chatId = process.argv[2] ?? process.env.MAX_TEST_CHAT_ID;
const text = process.argv[3] ?? 'hello 12345 - super check';

if (!chatId) {
  console.error('Usage: bun run scripts/test-max-notification.ts <chat_id> [text]');
  console.log('\nTo get your chat_id:');
  console.log('1. Open the MAX mini-app');
  console.log('2. Check the browser console for initDataUnsafe.chat.id');
  console.log('3. Or check the database for your Buyer record');
  console.log('\nOr set MAX_TEST_CHAT_ID in your environment and re-run without args.');
  process.exit(1);
}

sendMaxMessage(chatId, text);
