/**
 * Integration test: Telegram webhook + real DB
 *
 * Posts fabricated Telegram update JSON directly to the webhook route handler
 * and asserts the resulting DB state — no real Telegram traffic.
 *
 * Requires live Postgres DB (run with: bun run test:integration)
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { prisma } from '@/lib/db';
import { cleanupTestData } from '../happy/test-cleanup';
import { makeContactUpdate, makeStartUpdate } from '../helpers/mock-telegram-update';

// Mock only the notification side so no real bot calls go out
import { mock } from 'bun:test';

mock.module('@/lib/notifications/telegram', () => ({
  sendTelegramMessage: async () => ({ success: true }),
  sendTelegramContactRequest: async () => ({ success: true }),
}));

mock.module('@/lib/hawk', () => ({ captureError: () => {} }));

import { POST } from '@/app/api/webhooks/telegram/route';

const TEST_PREFIX = `test_integ_wh_${Date.now()}_`;
const TEST_USER_ID = 777000777;
const TEST_CHAT_ID = 777000777;

function makeWebhookRequest(
  body: Record<string, unknown>,
  bot: 'customer' | 'dealer' = 'customer'
) {
  return new Request(`http://localhost/api/webhooks/telegram?bot=${bot}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('Telegram webhook → DB (live)', () => {
  beforeAll(async () => {
    // Clear webhook secrets so requests don't need to include them in tests
    delete process.env.TG_WEBHOOK_SECRET;
    delete process.env.TG_DEALER_WEBHOOK_SECRET;
    await cleanupTestData(TEST_PREFIX);
  });

  afterAll(async () => {
    // Clean up the test buyer we created via the webhook
    await prisma.buyer.deleteMany({
      where: { platformUserId: String(TEST_USER_ID) },
    });
    await cleanupTestData(TEST_PREFIX);
    await prisma.$disconnect();
  });

  it('/start sends contact request, does not create buyer row', async () => {
    const update = makeStartUpdate(TEST_CHAT_ID);
    // Override user id so we can track it
    (update.message.from as { id: number }).id = TEST_USER_ID;
    (update.message.chat as { id: number }).id = TEST_CHAT_ID;

    const res = await POST(makeWebhookRequest(update));
    expect(res.status).toBe(200);

    const buyer = await prisma.buyer.findFirst({
      where: { platform: 'TELEGRAM', platformUserId: String(TEST_USER_ID) },
    });
    // /start alone should NOT create a buyer row
    expect(buyer).toBeNull();
  });

  it('contact shared → Buyer row created with phoneVerified=true', async () => {
    const update = makeContactUpdate(TEST_CHAT_ID, '79161234567', 'Иван');
    (update.message.from as { id: number }).id = TEST_USER_ID;
    (update.message.chat as { id: number }).id = TEST_CHAT_ID;

    const res = await POST(makeWebhookRequest(update));
    expect(res.status).toBe(200);

    const buyer = await prisma.buyer.findFirst({
      where: { platform: 'TELEGRAM', platformUserId: String(TEST_USER_ID) },
    });
    expect(buyer).not.toBeNull();
    expect(buyer!.phoneVerified).toBe(true);
    expect(buyer!.phone).toBe('79161234567');
    expect(buyer!.platformChatId).toBe(String(TEST_CHAT_ID));
  });

  it('duplicate contact share is idempotent — same buyer row, no crash', async () => {
    const update = makeContactUpdate(TEST_CHAT_ID, '79161234567');
    (update.message.from as { id: number }).id = TEST_USER_ID;
    (update.message.chat as { id: number }).id = TEST_CHAT_ID;

    const res = await POST(makeWebhookRequest(update));
    expect(res.status).toBe(200);

    // Still only one buyer row
    const count = await prisma.buyer.count({
      where: { platform: 'TELEGRAM', platformUserId: String(TEST_USER_ID) },
    });
    expect(count).toBe(1);
  });

  it('contact with invalid phone does not create/modify buyer', async () => {
    const badUserId = 888000888;
    const update = makeContactUpdate(badUserId, '12345'); // too short
    (update.message.from as { id: number }).id = badUserId;
    (update.message.chat as { id: number }).id = badUserId;

    const res = await POST(makeWebhookRequest(update));
    expect(res.status).toBe(200);

    const buyer = await prisma.buyer.findFirst({
      where: { platform: 'TELEGRAM', platformUserId: String(badUserId) },
    });
    expect(buyer).toBeNull();

    // Cleanup
    await prisma.buyer.deleteMany({
      where: { platformUserId: String(badUserId) },
    });
  });
});
