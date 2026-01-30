#!/usr/bin/env bun
import { sendTelegramMessage } from '../src/lib/notifications/telegram';

const [chatId, text = 'Test notification from AutoAuction'] = process.argv.slice(2);

if (!chatId) {
  console.error('Usage: bun run scripts/test-telegram-notification.ts <chat_id> [message]');
  console.error('');
  console.error('Example:');
  console.error(
    '  bun --env-file=.env.local run scripts/test-telegram-notification.ts 123456789 "Hello!"'
  );
  console.error('');
  console.error('To find your chat_id:');
  console.error('  1. Message @userinfobot on Telegram');
  console.error('  2. Or check: bun --env-file=.env.local run scripts/show-buyers.ts');
  process.exit(1);
}

console.log(`Sending Telegram message to chat_id: ${chatId}`);
console.log(`Message: "${text}"`);
console.log('');

const result = await sendTelegramMessage(chatId, text);

if (result.success) {
  console.log('✅ Message sent successfully');
} else {
  console.error('❌ Failed to send message:', result.error);
  process.exit(1);
}
