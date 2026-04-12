import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { createHmac } from 'crypto';
import { validateWebAppRequest } from '@/lib/auth/webapp-validation';

/**
 * Build a valid Telegram initData string with correct HMAC for a given bot token.
 */
function buildValidInitData(botToken: string, userId = 123456789): string {
  const user = JSON.stringify({ id: userId, first_name: 'Test', username: 'testuser' });
  const authDate = Math.floor(Date.now() / 1000);

  // Build data-check string (sorted key=value pairs, excluding hash)
  const params: Record<string, string> = {
    auth_date: String(authDate),
    user,
  };
  const dataCheckString = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  const sp = new URLSearchParams({ ...params, hash });
  return sp.toString();
}

const FAKE_TG_TOKEN = 'fake_tg_token_for_testing';
const FAKE_TG_DEALER_TOKEN = 'fake_tg_dealer_token';

describe('validateWebAppRequest', () => {
  const origTgToken = process.env.TG_BOT_TOKEN;
  const origTgDealerToken = process.env.TG_BOT_TOKEN_DEALER;
  const origMockAuth = process.env.MOCK_WEBAPP_AUTH;
  const origNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.TG_BOT_TOKEN = FAKE_TG_TOKEN;
    process.env.TG_BOT_TOKEN_DEALER = FAKE_TG_DEALER_TOKEN;
    process.env.MOCK_WEBAPP_AUTH = 'false';
  });

  afterEach(() => {
    process.env.TG_BOT_TOKEN = origTgToken;
    process.env.TG_BOT_TOKEN_DEALER = origTgDealerToken;
    process.env.MOCK_WEBAPP_AUTH = origMockAuth;
    process.env.NODE_ENV = origNodeEnv;
  });

  it('returns valid for correct HMAC', () => {
    const initData = buildValidInitData(FAKE_TG_TOKEN);
    const result = validateWebAppRequest(`Bearer telegram:customer:${initData}`);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.userId).toBe('123456789');
      expect(result.platform).toBe('telegram');
    }
  });

  it('rejects tampered hash', () => {
    const initData = buildValidInitData(FAKE_TG_TOKEN);
    const tampered = initData.replace(/hash=[^&]+/, 'hash=0000000000000000');
    const result = validateWebAppRequest(`Bearer telegram:customer:${tampered}`);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid initData hash');
  });

  it('returns valid for dealer bot with correct dealer token', () => {
    const initData = buildValidInitData(FAKE_TG_DEALER_TOKEN);
    const result = validateWebAppRequest(`Bearer telegram:dealer:${initData}`, 'dealer');
    expect(result.valid).toBe(true);
  });

  it('rejects missing authorization header', () => {
    const result = validateWebAppRequest(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Missing authorization header');
  });

  it('rejects wrong scheme', () => {
    const result = validateWebAppRequest('Basic sometoken');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid authorization format');
  });

  it('rejects token with only 2 segments (missing botType)', () => {
    // Regression: token must be platform:botType:initData — 3+ parts
    const result = validateWebAppRequest('Bearer telegram:someinitdata');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid token format');
  });

  it('rejects missing hash in initData', () => {
    const noHash = new URLSearchParams({
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 1, first_name: 'A' }),
    }).toString();
    const result = validateWebAppRequest(`Bearer telegram:customer:${noHash}`);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Missing hash in initData');
  });

  it('rejects missing user in initData', () => {
    const missingUser = new URLSearchParams({
      auth_date: String(Math.floor(Date.now() / 1000)),
      hash: 'aabbcc',
    }).toString();
    // Hash will fail first — but MOCK_WEBAPP_AUTH let's it through to user check
    process.env.NODE_ENV = 'development';
    process.env.MOCK_WEBAPP_AUTH = 'true';
    const result = validateWebAppRequest(`Bearer telegram:customer:${missingUser}`);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Missing user in initData');
  });

  it('MOCK_WEBAPP_AUTH=true in development bypasses hash and returns user', () => {
    process.env.NODE_ENV = 'development';
    process.env.MOCK_WEBAPP_AUTH = 'true';
    const user = JSON.stringify({ id: 999, first_name: 'Mock' });
    const initData = new URLSearchParams({
      auth_date: String(Math.floor(Date.now() / 1000)),
      user,
      hash: 'notrealhash',
    }).toString();
    const result = validateWebAppRequest(`Bearer telegram:customer:${initData}`);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.userId).toBe('999');
    }
  });
});
