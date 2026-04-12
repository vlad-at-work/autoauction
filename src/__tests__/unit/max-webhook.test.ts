import { describe, expect, it, mock, beforeEach } from 'bun:test';

// Mock sendMaxMessage before importing the handler
const sendMaxMessageCalls: Array<{ userId: number; text: string; botType: string }> = [];

mock.module('@/lib/notifications/max', () => ({
  sendMaxMessage: async (userId: number, text: string, _buttons: unknown[], botType: string) => {
    sendMaxMessageCalls.push({ userId, text, botType });
    return { ok: true };
  },
}));

mock.module('@/lib/db', () => ({
  prisma: {},
}));

import { POST } from '@/app/api/webhooks/max/route';

function makeRequest(body: Record<string, unknown>, bot = 'customer') {
  return new Request(`http://localhost/api/webhooks/max?bot=${bot}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('MAX webhook', () => {
  beforeEach(() => {
    sendMaxMessageCalls.length = 0;
  });

  it('sends welcome once for bot_started', async () => {
    const res = await POST(
      makeRequest({
        update_type: 'bot_started',
        user: { user_id: 123, first_name: 'Test' },
      })
    );

    expect(res.status).toBe(200);
    expect(sendMaxMessageCalls).toHaveLength(1);
    expect(sendMaxMessageCalls[0].userId).toBe(123);
    expect(sendMaxMessageCalls[0].botType).toBe('customer');
  });

  it('ignores message_created /start (no double welcome)', async () => {
    const res = await POST(
      makeRequest({
        update_type: 'message_created',
        message: {
          sender: { user_id: 123, first_name: 'Test' },
          body: { text: '/start' },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(sendMaxMessageCalls).toHaveLength(0);
  });

  it('ignores unrelated message_created events', async () => {
    const res = await POST(
      makeRequest({
        update_type: 'message_created',
        message: {
          sender: { user_id: 123, first_name: 'Test' },
          body: { text: 'hello' },
        },
      })
    );

    expect(res.status).toBe(200);
    expect(sendMaxMessageCalls).toHaveLength(0);
  });

  it('bot_started without user_id returns ok without sending', async () => {
    const res = await POST(
      makeRequest({
        update_type: 'bot_started',
        user: {},
      })
    );

    expect(res.status).toBe(200);
    expect(sendMaxMessageCalls).toHaveLength(0);
  });

  it('bot_started on dealer bot sends dealer welcome', async () => {
    const res = await POST(
      makeRequest(
        {
          update_type: 'bot_started',
          user: { user_id: 456, first_name: 'Dealer' },
        },
        'dealer'
      )
    );

    expect(res.status).toBe(200);
    expect(sendMaxMessageCalls).toHaveLength(1);
    expect(sendMaxMessageCalls[0].botType).toBe('dealer');
  });
});
