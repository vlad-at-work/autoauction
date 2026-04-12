import { describe, expect, it, mock, beforeEach } from 'bun:test';

// ---- Mocks ----

type DealerRecord = { id: string; name: string; deletedAt: null | Date } | null;
let mockDealer: DealerRecord = null;
const updateCalls: Array<{ where: unknown; data: unknown }> = [];

mock.module('@/lib/db', () => ({
  prisma: {
    dealer: {
      findUnique: async () => mockDealer,
      update: async (args: { where: unknown; data: unknown }) => {
        updateCalls.push(args);
        return { id: 'dealer-1', ...mockDealer };
      },
    },
  },
}));

mock.module('@/lib/hawk', () => ({ captureError: () => {} }));

import { POST } from '@/app/api/admin/dealers/[id]/invite/route';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(id: string) {
  return new Request(`http://localhost/api/admin/dealers/${id}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/admin/dealers/[id]/invite', () => {
  beforeEach(() => {
    mockDealer = null;
    updateCalls.length = 0;
    process.env.TG_BOT_NAME_DEALER = 'stagingaa_bot';
    process.env.MAX_BOT_NAME_DEALER = 'maxdealerbot';
  });

  it('returns 404 when dealer not found', async () => {
    mockDealer = null;
    const res = await POST(makeRequest('nonexistent'), makeContext('nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns 404 for soft-deleted dealer', async () => {
    mockDealer = { id: 'dealer-1', name: 'Test', deletedAt: new Date() };
    const res = await POST(makeRequest('dealer-1'), makeContext('dealer-1'));
    expect(res.status).toBe(404);
  });

  it('returns invite token and URLs for valid dealer', async () => {
    mockDealer = { id: 'dealer-1', name: 'Test Dealer', deletedAt: null };
    const res = await POST(makeRequest('dealer-1'), makeContext('dealer-1'));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      ok: boolean;
      inviteToken: string;
      inviteTokenExpiresAt: string;
      maxInviteUrl: string;
      tgInviteUrl: string;
    };
    expect(body.ok).toBe(true);
    expect(body.inviteToken).toMatch(/^\d{6}$/);
  });

  it('Telegram invite uses ?start= (not ?startapp=)', async () => {
    mockDealer = { id: 'dealer-1', name: 'Test Dealer', deletedAt: null };
    const res = await POST(makeRequest('dealer-1'), makeContext('dealer-1'));
    const body = (await res.json()) as { tgInviteUrl: string; inviteToken: string };

    // Critical: must be ?start= for chat-opening deep link (per CLAUDE.md gotcha)
    expect(body.tgInviteUrl).toContain('?start=');
    expect(body.tgInviteUrl).not.toContain('?startapp=');
    expect(body.tgInviteUrl).toContain(body.inviteToken);
  });

  it('MAX invite also uses ?start=', async () => {
    mockDealer = { id: 'dealer-1', name: 'Test Dealer', deletedAt: null };
    const res = await POST(makeRequest('dealer-1'), makeContext('dealer-1'));
    const body = (await res.json()) as { maxInviteUrl: string; inviteToken: string };

    expect(body.maxInviteUrl).toContain('?start=');
    expect(body.maxInviteUrl).toContain(body.inviteToken);
  });

  it('updates dealer inviteToken in DB', async () => {
    mockDealer = { id: 'dealer-1', name: 'Test Dealer', deletedAt: null };
    await POST(makeRequest('dealer-1'), makeContext('dealer-1'));

    expect(updateCalls).toHaveLength(1);
    const data = updateCalls[0].data as { inviteToken: string; inviteTokenExpiresAt: Date };
    expect(data.inviteToken).toMatch(/^\d{6}$/);
    expect(data.inviteTokenExpiresAt).toBeInstanceOf(Date);
  });

  it('returns null tgInviteUrl when TG_BOT_NAME_DEALER is not set', async () => {
    delete process.env.TG_BOT_NAME_DEALER;
    mockDealer = { id: 'dealer-1', name: 'Test Dealer', deletedAt: null };
    const res = await POST(makeRequest('dealer-1'), makeContext('dealer-1'));
    const body = (await res.json()) as { tgInviteUrl: null };
    expect(body.tgInviteUrl).toBeNull();
  });
});
