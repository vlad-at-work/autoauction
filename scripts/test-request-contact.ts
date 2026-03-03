/**
 * Test script: Send a message with request_contact button to a MAX user
 *
 * Usage:
 *   bun scripts/test-request-contact.ts <user_id> [message_text]
 *
 * Example:
 *   bun scripts/test-request-contact.ts 123456789
 *   bun scripts/test-request-contact.ts 123456789 "Please share your contact info"
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read .env.local
function readEnvFile(path: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = readFileSync(path, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const env = readEnvFile(resolve(import.meta.dir, '../.env.local'));
const MAX_TOKEN = env['MAX_BOT_TOKEN'] ?? '';

const userId = process.argv[2];
const messageText = process.argv[3] || 'Поделитесь своим контактом для подтверждения';

if (!userId) {
  console.error('Usage: bun scripts/test-request-contact.ts <user_id> [message_text]');
  console.error('');
  console.error('Example:');
  console.error('  bun scripts/test-request-contact.ts 123456789');
  process.exit(1);
}

if (!MAX_TOKEN) {
  console.error('Error: MAX_BOT_TOKEN not found in .env.local');
  process.exit(1);
}

async function sendRequestContactButton(userId: string, text: string) {
  const body = {
    text,
    attachments: [
      {
        type: 'inline_keyboard',
        payload: {
          buttons: [
            [
              {
                type: 'request_contact',
                text: '📱 Поделиться контактом',
              },
            ],
          ],
        },
      },
    ],
  };

  const url = `https://platform-api.max.ru/messages?user_id=${userId}`;

  console.log('Sending message with request_contact button...');
  console.log('User ID:', userId);
  console.log('Message:', text);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: MAX_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: HTTP ${response.status}`);
      console.error('Response:', errorText);
      process.exit(1);
    }

    console.log('✅ Message sent successfully!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('WHAT HAPPENS WHEN USER CLICKS THE BUTTON:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('1. User sees a native MAX dialog:');
    console.log('   "Поделиться контактом с ботом?"');
    console.log('   [Отмена] [Поделиться]');
    console.log('');
    console.log('2. If user clicks "Поделиться":');
    console.log('   • Their contact info is sent to your bot via webhook');
    console.log('   • You receive a message with contact attachment');
    console.log('   • Phone number is VERIFIED (comes from MAX profile)');
    console.log('');
    console.log('3. Webhook event type: "message_created"');
    console.log('   The message will have:');
    console.log('   { message: { body: { text: "", attachments: [');
    console.log('     { type: "contact", payload: {');
    console.log('       phone: "+79001234567",');
    console.log('       first_name: "Ivan",');
    console.log('       last_name: "Ivanov",');
    console.log('       user_id: 123456789');
    console.log('     }}');
    console.log('   ]}}');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('CURRENT WEBHOOK STATUS:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('⚠️  Your webhook (/api/webhooks/max) does NOT currently');
    console.log('   handle contact events. It only handles "bot_started".');
    console.log('');
    console.log('To handle contact sharing, add this to your webhook:');
    console.log('');
    console.log('  if (updateType === "message_created") {');
    console.log('    const attachments = update.message?.body?.attachments;');
    console.log('    const contact = attachments?.find(a => a.type === "contact");');
    console.log('    if (contact) {');
    console.log('      const { phone, first_name, last_name, user_id } = contact.payload;');
    console.log('      // Save to database, etc.');
    console.log('    }');
    console.log('  }');
    console.log('');
  } catch (err) {
    console.error('Error sending message:', err);
    process.exit(1);
  }
}

sendRequestContactButton(userId, messageText);
