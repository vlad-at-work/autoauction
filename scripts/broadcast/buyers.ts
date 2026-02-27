/**
 * Broadcast a message to all buyers (Telegram + MAX).
 *
 * Usage:
 *   bun scripts/broadcast/buyers.ts <message.html>
 *   bun scripts/broadcast/buyers.ts <message.html> --dry-run
 */

import postgres from 'postgres';
import { createInterface } from 'readline';
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

// --- Read .env.local literally (no shell $ expansion) ---
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

const env = readEnvFile(resolve(import.meta.dir, '../../.env.local'));
const DB_URL = env['POSTGRES_PRISMA_URL'];
const TG_TOKEN = env['TG_BOT_TOKEN'] ?? '';
const MAX_TOKEN = env['MAX_BOT_TOKEN'] ?? '';

if (!DB_URL) {
  console.error('POSTGRES_PRISMA_URL not found in .env.local');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const messageFile = process.argv.find((a) => !a.startsWith('--') && a.endsWith('.html'));

if (!messageFile) {
  console.error('Usage: bun scripts/broadcast/buyers.ts <message.html> [--dry-run]');
  process.exit(1);
}

const htmlMessage = await Bun.file(messageFile).text();
const plainMessage = htmlMessage
  .replace(/<[^>]+>/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

function clearLine() {
  process.stdout.write('\r' + ' '.repeat(60) + '\r');
}

async function sendTelegram(
  chatId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
  return { ok: true };
}

async function sendMax(userId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`https://platform-api.max.ru/messages?user_id=${userId}`, {
    method: 'POST',
    headers: { Authorization: MAX_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${await res.text()}` };
  return { ok: true };
}

const sql = postgres(DB_URL, { ssl: 'require', max: 1 });

const buyers = await sql<
  {
    platform: string;
    platformUserId: string;
    platformChatId: string | null;
    platformUserName: string | null;
  }[]
>`
  SELECT platform, "platformUserId", "platformChatId", "platformUserName" FROM "Buyer"
`;

await sql.end();

const tgBuyers = buyers.filter((b) => b.platform === 'TELEGRAM' && b.platformChatId);
const maxBuyers = buyers.filter((b) => b.platform === 'MAX' && b.platformUserId);
const total = tgBuyers.length + maxBuyers.length;

console.log(`\nMessage preview (first 3 lines):`);
console.log('─'.repeat(50));
console.log(htmlMessage.split('\n').slice(0, 3).join('\n'));
console.log('─'.repeat(50));
console.log(`\nRecipients: Telegram ${tgBuyers.length}, MAX ${maxBuyers.length}, total ${total}`);

if (isDryRun) {
  console.log('\n[dry-run] No messages sent.\n');
  process.exit(0);
}

if (total === 0) {
  console.log('\nNo recipients found.\n');
  process.exit(0);
}

const ok = await confirm(`\nSend to all ${total} buyers? (y/N) `);
if (!ok) {
  console.log('Aborted.');
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const errorLogPath = `scripts/broadcast/errors-buyers-${timestamp}.txt`;
const errors: string[] = [];
let sent = 0;

console.log('');

const all = [
  ...tgBuyers.map((b) => ({
    platform: 'TELEGRAM',
    id: b.platformChatId!,
    name: b.platformUserName,
  })),
  ...maxBuyers.map((b) => ({ platform: 'MAX', id: b.platformUserId, name: b.platformUserName })),
];

for (const r of all) {
  sent++;
  process.stdout.write(`\r${sent}/${total}`);

  const result =
    r.platform === 'TELEGRAM'
      ? await sendTelegram(r.id, htmlMessage)
      : await sendMax(r.id, plainMessage);

  if (!result.ok) {
    const entry = `[${r.platform}] id=${r.id} name=${r.name ?? '?'}: ${result.error}`;
    errors.push(entry);
    clearLine();
    console.error(`  FAIL ${entry}`);
  }

  if (sent < total) await Bun.sleep(50);
}

clearLine();
console.log(`Done: ${sent - errors.length}/${total} delivered, ${errors.length} failed.`);

if (errors.length > 0) {
  writeFileSync(errorLogPath, errors.join('\n') + '\n');
  console.log(`Errors written to ${errorLogPath}`);
}
