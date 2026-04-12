import { describe, expect, it } from 'bun:test';
import {
  generateInviteToken,
  createInviteTokenData,
  isInviteTokenValid,
} from '@/lib/auth/dealer-invite';

describe('generateInviteToken', () => {
  it('returns a 6-character string', () => {
    expect(generateInviteToken()).toHaveLength(6);
  });

  it('contains only digits', () => {
    for (let i = 0; i < 20; i++) {
      expect(generateInviteToken()).toMatch(/^\d{6}$/);
    }
  });

  it('produces different tokens on repeated calls', () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateInviteToken()));
    // With 1M combinations, 20 calls should almost certainly yield > 1 unique value
    expect(tokens.size).toBeGreaterThan(1);
  });
});

describe('createInviteTokenData', () => {
  it('returns token and expiresAt', () => {
    const { token, expiresAt } = createInviteTokenData();
    expect(token).toMatch(/^\d{6}$/);
    expect(expiresAt).toBeInstanceOf(Date);
  });

  it('sets expiry ~7 days in the future', () => {
    const before = Date.now();
    const { expiresAt } = createInviteTokenData();
    const after = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});

describe('isInviteTokenValid', () => {
  it('returns true for a future expiry date', () => {
    const future = new Date(Date.now() + 60_000);
    expect(isInviteTokenValid(future)).toBe(true);
  });

  it('returns false for a past expiry date', () => {
    const past = new Date(Date.now() - 60_000);
    expect(isInviteTokenValid(past)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isInviteTokenValid(null)).toBe(false);
  });

  it('returns false for expiry exactly at now (boundary)', () => {
    // Just barely expired
    const almostNow = new Date(Date.now() - 1);
    expect(isInviteTokenValid(almostNow)).toBe(false);
  });
});
