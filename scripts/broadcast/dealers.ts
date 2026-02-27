/**
 * Broadcast a message to all active dealers (Telegram + MAX).
 *
 * Usage:
 *   bun scripts/broadcast/dealers.ts <message.html>
 *   bun scripts/broadcast/dealers.ts <message.html> --dry-run
 *
 * Only sends to dealers who have connected a bot account (platformUserId set).
 */

import postgres from 'postgres';
import { createInterface } from 'readline';
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

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
const TG_TOKEN = env['TG_BOT_TOKEN_DEALER'] ?? '';
const MAX_TOKEN = env['MAX_BOT_TOKEN_DEALER'] ?? '';

if (!DB_URL) {
  console.error('POSTGRES_PRISMA_URL not found in .env.local');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');
const messageFile = process.argv.find((a) => !a.startsWith('--') && a.endsWith('.html'));

if (!messageFile) {
  console.error('Usage: bun scripts/broadcast/dealers.ts <message.html> [--dry-run]');
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

const dealers = await sql<
  {
    platform: string | null;
    platformUserId: string | null;
    platformChatId: string | null;
    name: string | null;
    username: string;
  }[]
>`
  SELECT platform, "platformUserId", "platformChatId", name, username FROM "Dealer"
  WHERE active = true AND "platformUserId" IS NOT NULL
`;

await sql.end();

const tgDealers = dealers.filter((d) => d.platform === 'TELEGRAM' && d.platformChatId);
const maxDealers = dealers.filter((d) => d.platform === 'MAX' && d.platformUserId);
const total = tgDealers.length + maxDealers.length;

console.log(`\nMessage preview (first 3 lines):`);
console.log('─'.repeat(50));
console.log(htmlMessage.split('\n').slice(0, 3).join('\n'));
console.log('─'.repeat(50));
console.log(`\nRecipients: Telegram ${tgDealers.length}, MAX ${maxDealers.length}, total ${total}`);

if (isDryRun) {
  console.log('\n[dry-run] No messages sent.\n');
  process.exit(0);
}

if (total === 0) {
  console.log('\nNo reachable dealers found (must have connected a bot account).\n');
  process.exit(0);
}

const ok = await confirm(`\nSend to all ${total} dealers? (y/N) `);
if (!ok) {
  console.log('Aborted.');
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const errorLogPath = `scripts/broadcast/errors-dealers-${timestamp}.txt`;
const errors: string[] = [];
let sent = 0;

console.log('');

const all = [
  ...tgDealers.map((d) => ({
    platform: 'TELEGRAM',
    id: d.platformChatId!,
    name: d.name ?? d.username,
  })),
  ...maxDealers.map((d) => ({
    platform: 'MAX',
    id: d.platformUserId!,
    name: d.name ?? d.username,
  })),
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
