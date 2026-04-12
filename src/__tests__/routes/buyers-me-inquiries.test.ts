import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { createHmac } from 'crypto';

// ---- Auth helper ----
const FAKE_TG_TOKEN = 'test_buyers_inquiries_token';

function buildInitData(userId = '123456789') {
  const user = JSON.stringify({ id: Number(userId), first_name: 'Test' });
  const authDate = String(Math.floor(Date.now() / 1000));
  const params: Record<string, string> = { auth_date: authDate, user };
  const dataCheckString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('\n');
  const secretKey = createHmac('sha256', 'WebAppData').update(FAKE_TG_TOKEN).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...params, hash }).toString();
}

function makeAuthHeader(userId = '123456789') {
  return `Bearer telegram:customer:${buildInitData(userId)}`;
}

// ---- Mocks ----

type BuyerRecord = {
  id: string;
  inquiriesUsedThisMonth: number;
  inquiryLimitResetAt: Date;
} | null;

let mockBuyer: BuyerRecord = null;
let mockInquiries: unknown[] = [];

mock.module('@/lib/db', () => ({
  prisma: {
    buyer: {
      findFirst: async () => mockBuyer,
    },
    inquiry: {
      findMany: async () => mockInquiries,
    },
  },
}));

mock.module('@/lib/hawk', () => ({ captureError: () => {} }));

import { GET } from '@/app/api/buyers/me/inquiries/route';

function makeRequest(userId?: string) {
  return new Request('http://localhost/api/buyers/me/inquiries', {
    method: 'GET',
    headers: {
      Authorization: makeAuthHeader(userId),
    },
  });
}

describe('GET /api/buyers/me/inquiries', () => {
  beforeEach(() => {
    process.env.TG_BOT_TOKEN = FAKE_TG_TOKEN;
    mockBuyer = null;
    mockInquiries = [];
  });

  it('returns 401 without auth', async () => {
    const res = await GET(
      new Request('http://localhost/api/buyers/me/inquiries', { method: 'GET' })
    );
    expect(res.status).toBe(401);
  });

  it('returns empty list with full limit for new user (no buyer record)', async () => {
    mockBuyer = null;
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      inquiries: unknown[];
      limits: { used: number; max: number; remaining: number };
    };
    expect(body.inquiries).toHaveLength(0);
    expect(body.limits.used).toBe(0);
    expect(body.limits.max).toBe(2);
    expect(body.limits.remaining).toBe(2);
  });

  it('returns inquiries ordered descending', async () => {
    mockBuyer = {
      id: 'buyer-1',
      inquiriesUsedThisMonth: 1,
      inquiryLimitResetAt: new Date(Date.now() + 86_400_000),
    };
    mockInquiries = [
      {
        id: 'inq-2',
        createdAt: new Date('2024-01-02'),
        offers: [],
        _count: { transactions: 0 },
        transactions: [],
      },
      {
        id: 'inq-1',
        createdAt: new Date('2024-01-01'),
        offers: [],
        _count: { transactions: 0 },
        transactions: [],
      },
    ];

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { inquiries: Array<{ id: string }> };
    expect(body.inquiries[0].id).toBe('inq-2'); // most recent first
  });

  it('shows correct remaining inquiries when under limit', async () => {
    mockBuyer = {
      id: 'buyer-1',
      inquiriesUsedThisMonth: 1,
      inquiryLimitResetAt: new Date(Date.now() + 86_400_000),
    };
    mockInquiries = [];

    const res = await GET(makeRequest());
    const body = (await res.json()) as { limits: { remaining: number; used: number } };
    expect(body.limits.remaining).toBe(1);
    expect(body.limits.used).toBe(1);
  });

  it('resets limit when inquiryLimitResetAt is in the past', async () => {
    mockBuyer = {
      id: 'buyer-1',
      inquiriesUsedThisMonth: 2, // maxed out
      inquiryLimitResetAt: new Date(Date.now() - 1000), // expired
    };
    mockInquiries = [];

    const res = await GET(makeRequest());
    const body = (await res.json()) as { limits: { remaining: number; resetsAt: null } };
    expect(body.limits.remaining).toBe(2); // reset to full
    expect(body.limits.resetsAt).toBeNull();
  });
});
