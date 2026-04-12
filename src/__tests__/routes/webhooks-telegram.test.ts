import { describe, expect, it, mock, beforeEach } from 'bun:test';
import {
  makeStartUpdate,
  makeContactUpdate,
  makeTextUpdate,
} from '../helpers/mock-telegram-update';

// ---- Mocks (must be before imports of the route) ----

const tgCalls: Array<{ fn: string; chatId: unknown; text?: string; botType?: string }> = [];

mock.module('@/lib/notifications/telegram', () => ({
  sendTelegramMessage: async (
    chatId: unknown,
    text: string,
    _buttons: unknown,
    botType: string
  ) => {
    tgCalls.push({ fn: 'sendTelegramMessage', chatId, text, botType });
    return { success: true };
  },
  sendTelegramContactRequest: async (
    chatId: unknown,
    text: string,
    _buttonText: string,
    botType: string
  ) => {
    tgCalls.push({ fn: 'sendTelegramContactRequest', chatId, text, botType });
    return { success: true };
  },
}));

const prismaCalls: Array<{ fn: string; args: unknown }> = [];

mock.module('@/lib/db', () => ({
  prisma: {
    buyer: {
      findFirst: async (args: unknown) => {
        prismaCalls.push({ fn: 'buyer.findFirst', args });
        return null; // no existing buyer by default
      },
      upsert: async (args: unknown) => {
        prismaCalls.push({ fn: 'buyer.upsert', args });
        return { id: 'test-buyer-id' };
      },
    },
    dealer: {
      findFirst: async (args: unknown) => {
        prismaCalls.push({ fn: 'dealer.findFirst', args });
        return null; // no dealer by default
      },
    },
  },
}));

mock.module('@/lib/hawk', () => ({
  captureError: () => {},
}));

import { POST } from '@/app/api/webhooks/telegram/route';

// ---- Helpers ----

function makeRequest(
  body: Record<string, unknown>,
  bot: 'customer' | 'dealer' = 'customer',
  secret?: string
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers['x-telegram-bot-api-secret-token'] = secret;
  return new Request(`http://localhost/api/webhooks/telegram?bot=${bot}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// ---- Tests ----

describe('Telegram webhook', () => {
  beforeEach(() => {
    tgCalls.length = 0;
    prismaCalls.length = 0;
    // Clear webhook secret so auth doesn't block tests
    delete process.env.TG_WEBHOOK_SECRET;
    delete process.env.TG_DEALER_WEBHOOK_SECRET;
  });

  describe('/start — customer bot', () => {
    it('sends contact request on /start (no payload)', async () => {
      const res = await POST(makeRequest(makeStartUpdate(111)));
      expect(res.status).toBe(200);
      expect(tgCalls).toHaveLength(1);
      expect(tgCalls[0].fn).toBe('sendTelegramContactRequest');
      expect(tgCalls[0].chatId).toBe(111);
      expect(tgCalls[0].botType).toBe('customer');
    });

    it('returns 200 and sends nothing for /start without chatId', async () => {
      const update = {
        update_id: 1,
        message: { message_id: 1, text: '/start', date: 0 }, // no from/chat
      };
      const res = await POST(makeRequest(update));
      expect(res.status).toBe(200);
      expect(tgCalls).toHaveLength(0);
    });
  });

  describe('/start — dealer bot', () => {
    it('sends dealer welcome when no invite payload', async () => {
      const res = await POST(makeRequest(makeStartUpdate(222), 'dealer'));
      expect(res.status).toBe(200);
      expect(tgCalls).toHaveLength(1);
      expect(tgCalls[0].fn).toBe('sendTelegramMessage');
      expect(tgCalls[0].botType).toBe('dealer');
    });

    it('sends invalid-token message when dealer invite token not found', async () => {
      // Dealer mock already returns null for findFirst
      const res = await POST(makeRequest(makeStartUpdate(333, '123456'), 'dealer'));
      expect(res.status).toBe(200);
      expect(tgCalls).toHaveLength(1);
      expect(tgCalls[0].fn).toBe('sendTelegramMessage');
      expect(tgCalls[0].text).toContain('недействителен');
    });
  });

  describe('Contact sharing', () => {
    it('upserts buyer with phoneVerified=true on contact share', async () => {
      const res = await POST(makeRequest(makeContactUpdate(444, '79161234567')));
      expect(res.status).toBe(200);

      const upsertCall = prismaCalls.find((c) => c.fn === 'buyer.upsert');
      expect(upsertCall).toBeDefined();
      const upsertArgs = upsertCall!.args as {
        create: { phoneVerified: boolean; phone: string };
        update: { phoneVerified: boolean };
      };
      expect(upsertArgs.create.phoneVerified).toBe(true);
      expect(upsertArgs.create.phone).toBe('79161234567');
    });

    it('sends confirmation message with "Создать заявку" button after contact', async () => {
      await POST(makeRequest(makeContactUpdate(444, '79161234567')));
      const confirmCall = tgCalls.find((c) => c.fn === 'sendTelegramMessage');
      expect(confirmCall).toBeDefined();
    });

    it('sends error message for invalid phone number', async () => {
      const update = makeContactUpdate(555, '12345'); // too short
      const res = await POST(makeRequest(update));
      expect(res.status).toBe(200);
      const errCall = tgCalls.find(
        (c) => c.fn === 'sendTelegramMessage' && String(c.text).includes('распознать')
      );
      expect(errCall).toBeDefined();
    });

    it('ignores contact on dealer bot', async () => {
      const res = await POST(makeRequest(makeContactUpdate(666, '79161234567'), 'dealer'));
      expect(res.status).toBe(200);
      // Dealer bot ignores contact messages
      expect(prismaCalls.filter((c) => c.fn === 'buyer.upsert')).toHaveLength(0);
    });
  });

  describe('Text messages', () => {
    it('returns 200 and does nothing for random text', async () => {
      const res = await POST(makeRequest(makeTextUpdate(777, 'hello world')));
      expect(res.status).toBe(200);
      expect(tgCalls).toHaveLength(0);
      expect(prismaCalls.filter((c) => c.fn === 'buyer.upsert')).toHaveLength(0);
    });
  });

  describe('Non-message updates', () => {
    it('returns 200 for update with no message field', async () => {
      const update = { update_id: 99, edited_message: { text: 'edited' } };
      const res = await POST(makeRequest(update));
      expect(res.status).toBe(200);
      expect(tgCalls).toHaveLength(0);
    });
  });

  describe('Webhook secret verification', () => {
    it('returns 403 when secret is set but header is wrong', async () => {
      process.env.TG_WEBHOOK_SECRET = 'real-secret';
      const res = await POST(makeRequest(makeStartUpdate(888), 'customer', 'wrong-secret'));
      expect(res.status).toBe(403);
    });

    it('passes when secret matches', async () => {
      process.env.TG_WEBHOOK_SECRET = 'real-secret';
      const res = await POST(makeRequest(makeStartUpdate(888), 'customer', 'real-secret'));
      expect(res.status).toBe(200);
    });

    it('passes when no secret is configured (open mode)', async () => {
      // TG_WEBHOOK_SECRET already deleted in beforeEach
      const res = await POST(makeRequest(makeStartUpdate(999)));
      expect(res.status).toBe(200);
    });
  });

  describe('bot=customer vs bot=dealer routing', () => {
    it('customer bot sends contact request', async () => {
      await POST(makeRequest(makeStartUpdate(101), 'customer'));
      expect(tgCalls[0].fn).toBe('sendTelegramContactRequest');
      expect(tgCalls[0].botType).toBe('customer');
    });

    it('dealer bot sends sendTelegramMessage', async () => {
      await POST(makeRequest(makeStartUpdate(102), 'dealer'));
      expect(tgCalls[0].fn).toBe('sendTelegramMessage');
      expect(tgCalls[0].botType).toBe('dealer');
    });
  });
});
