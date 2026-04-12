import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { createHmac } from 'crypto';

// ---- Mocks ----

const notifyCalls: Array<{ fn: string; args: unknown[] }> = [];

mock.module('@/lib/notifications', () => ({
  notifyBuyer: async (...args: unknown[]) => {
    notifyCalls.push({ fn: 'notifyBuyer', args });
    return { success: true };
  },
  notifyDealerOfAcceptedOfferViaBot: async (...args: unknown[]) => {
    notifyCalls.push({ fn: 'notifyDealerOfAcceptedOfferViaBot', args });
    return { success: true };
  },
}));

mock.module('@/lib/hawk', () => ({ captureError: () => {} }));

// Offer factory for prisma mock
function makeOffer(overrides: {
  transactionCount?: number;
  hasTransaction?: boolean;
  sameDealerTransaction?: boolean;
  buyerPlatform?: string;
  buyerUserId?: string;
  expired?: boolean;
}) {
  const {
    transactionCount = 0,
    hasTransaction = false,
    sameDealerTransaction = false,
    buyerPlatform = 'TELEGRAM',
    buyerUserId = '123456789',
    expired = false,
  } = overrides;

  const transactions = Array.from({ length: transactionCount }, (_, i) => ({
    id: `tx-${i}`,
    dealerId: i === 0 && sameDealerTransaction ? 'dealer-abc' : `other-dealer-${i}`,
  }));

  return {
    id: 'offer-1',
    offerId: 'offer-1',
    dealerId: 'dealer-abc',
    inquiryId: 'inquiry-1',
    price: 1_500_000,
    transaction: hasTransaction ? { id: 'existing-tx' } : null,
    inquiry: {
      id: 'inquiry-1',
      name: 'Иван Иванов',
      email: 'ivan@example.com',
      phone: '79161234567',
      model: 'Toyota',
      submodel: 'Camry',
      transmission: 'automatic',
      color: 'white',
      expiresAt: expired ? new Date(Date.now() - 1000) : new Date(Date.now() + 86_400_000),
      deletedAt: null,
      transactions,
      buyer: {
        platform: buyerPlatform,
        platformUserId: buyerUserId,
        platformChatId: '123456789',
        platformHandle: '@ivan',
      },
    },
    dealer: {
      id: 'dealer-abc',
      username: 'autodealer',
      name: 'Авто Дилер',
      subName: null,
      phone: '79991234567',
      email: 'dealer@example.com',
      description: 'Хороший дилер',
      platform: 'TELEGRAM',
      platformUserId: '987654321',
      platformChatId: '987654321',
      deletedAt: null,
    },
  };
}

// ---- Prisma mock state ----
let mockOffer: ReturnType<typeof makeOffer> | null = null;
let createdTransaction: unknown = null;

mock.module('@/lib/db', () => ({
  prisma: {
    offer: {
      findFirst: async () => mockOffer,
    },
    transaction: {
      create: async (args: { data: Record<string, unknown> }) => {
        createdTransaction = args.data;
        return { id: 'new-tx-id', ...args.data };
      },
    },
  },
}));

// ---- Auth helper ----
const FAKE_TG_TOKEN = 'test_transaction_token';

function buildInitData(userId = '123456789'): string {
  const user = JSON.stringify({ id: Number(userId), first_name: 'Ivan' });
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

function makeRequest(body: unknown, userId?: string) {
  return new Request('http://localhost/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: makeAuthHeader(userId),
    },
    body: JSON.stringify(body),
  });
}

import { POST } from '@/app/api/transactions/route';

describe('POST /api/transactions', () => {
  beforeEach(() => {
    process.env.TG_BOT_TOKEN = FAKE_TG_TOKEN;
    mockOffer = null;
    createdTransaction = null;
    notifyCalls.length = 0;
  });

  it('returns 401 without auth header', async () => {
    const res = await POST(
      new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: 'offer-1' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing offerId', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 404 when offer not found', async () => {
    mockOffer = null;
    const res = await POST(makeRequest({ offerId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('returns 403 when buyer platform/userId does not match auth', async () => {
    mockOffer = makeOffer({ buyerUserId: 'someone-else' });
    const res = await POST(makeRequest({ offerId: 'offer-1' }));
    expect(res.status).toBe(403);
  });

  it('returns 410 when inquiry is expired', async () => {
    mockOffer = makeOffer({ expired: true });
    const res = await POST(makeRequest({ offerId: 'offer-1' }));
    expect(res.status).toBe(410);
  });

  it('returns 409 when offer already has a transaction', async () => {
    mockOffer = makeOffer({ hasTransaction: true });
    const res = await POST(makeRequest({ offerId: 'offer-1' }));
    expect(res.status).toBe(409);
  });

  it('returns 409 when same dealer already has a transaction on inquiry', async () => {
    mockOffer = makeOffer({ transactionCount: 1, sameDealerTransaction: true });
    const res = await POST(makeRequest({ offerId: 'offer-1' }));
    expect(res.status).toBe(409);
  });

  it('returns 409 when max transactions reached (3)', async () => {
    mockOffer = makeOffer({ transactionCount: 3 });
    const res = await POST(makeRequest({ offerId: 'offer-1' }));
    expect(res.status).toBe(409);
  });

  it('creates transaction with buyer snapshot fields', async () => {
    mockOffer = makeOffer({});
    const res = await POST(makeRequest({ offerId: 'offer-1' }));
    const body = (await res.json()) as { id: string; success: boolean };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);

    const tx = createdTransaction as Record<string, unknown>;
    expect(tx.buyerPlatform).toBe('TELEGRAM');
    expect(tx.buyerPlatformUserId).toBe('123456789');
    expect(tx.buyerPlatformHandle).toBe('@ivan');
    expect(tx.buyerName).toBe('Иван Иванов');
    expect(tx.buyerPhone).toBe('79161234567');
    expect(tx.offerPrice).toBe(1_500_000);
  });

  it('sends buyer and dealer notifications on success', async () => {
    mockOffer = makeOffer({});
    await POST(makeRequest({ offerId: 'offer-1' }));
    expect(notifyCalls.some((c) => c.fn === 'notifyBuyer')).toBe(true);
    expect(notifyCalls.some((c) => c.fn === 'notifyDealerOfAcceptedOfferViaBot')).toBe(true);
  });

  it('returns remainingAcceptances in response', async () => {
    mockOffer = makeOffer({ transactionCount: 1 });
    const res = await POST(makeRequest({ offerId: 'offer-1' }));
    const body = (await res.json()) as { remainingAcceptances: number };
    expect(res.status).toBe(200);
    expect(body.remainingAcceptances).toBe(1); // 3 max - 1 existing - 1 new = 1
  });
});
