import { describe, expect, it } from 'bun:test';
import { formatPhoneRU } from '@/lib/format-phone';
import { normalizePhone } from '@/lib/phone';

describe('formatPhoneRU', () => {
  it('formats 11-digit number starting with 7', () => {
    expect(formatPhoneRU('79161234567')).toBe('+7 (916) 123-45-67');
  });

  it('formats 11-digit number starting with 8 (legacy format)', () => {
    expect(formatPhoneRU('89161234567')).toBe('+7 (916) 123-45-67');
  });

  it('formats 10-digit number', () => {
    expect(formatPhoneRU('9161234567')).toBe('+7 (916) 123-45-67');
  });

  it('returns - for null', () => {
    expect(formatPhoneRU(null)).toBe('-');
  });

  it('returns - for undefined', () => {
    expect(formatPhoneRU(undefined)).toBe('-');
  });

  it('returns - for empty string', () => {
    expect(formatPhoneRU('')).toBe('-');
  });

  it('returns original string for unrecognized format', () => {
    const weird = 'not-a-phone';
    expect(formatPhoneRU(weird)).toBe(weird);
  });

  it('round-trips with normalizePhone', () => {
    const original = '79161234567';
    const formatted = formatPhoneRU(original);
    const normalized = normalizePhone(formatted);
    expect(normalized).toBe(original);
  });
});
