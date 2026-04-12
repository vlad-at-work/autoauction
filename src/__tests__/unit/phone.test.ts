import { describe, expect, it } from 'bun:test';
import { normalizePhone } from '@/lib/phone';

describe('normalizePhone', () => {
  describe('valid inputs', () => {
    it('passes through 7XXXXXXXXXX unchanged', () => {
      expect(normalizePhone('79161234567')).toBe('79161234567');
    });

    it('converts 8XXXXXXXXXX to 7XXXXXXXXXX', () => {
      expect(normalizePhone('89161234567')).toBe('79161234567');
    });

    it('strips +7 prefix and returns 7XXXXXXXXXX', () => {
      expect(normalizePhone('+79161234567')).toBe('79161234567');
    });

    it('adds 7 prefix to 10-digit number', () => {
      expect(normalizePhone('9161234567')).toBe('79161234567');
    });

    it('strips spaces', () => {
      expect(normalizePhone('7 916 123 45 67')).toBe('79161234567');
    });

    it('strips dashes', () => {
      expect(normalizePhone('7-916-123-45-67')).toBe('79161234567');
    });

    it('strips parentheses', () => {
      expect(normalizePhone('+7 (916) 123-45-67')).toBe('79161234567');
    });

    it('handles mixed formatting with 8 prefix', () => {
      expect(normalizePhone('8 (916) 123-45-67')).toBe('79161234567');
    });
  });

  describe('invalid inputs', () => {
    it('returns null for empty string', () => {
      expect(normalizePhone('')).toBeNull();
    });

    it('returns null for too-short number', () => {
      expect(normalizePhone('12345')).toBeNull();
    });

    it('returns null for non-Russian country code', () => {
      // 11 digits not starting with 7 after normalization
      expect(normalizePhone('12345678901')).toBeNull();
    });

    it('returns null for 12-digit number', () => {
      expect(normalizePhone('791612345678')).toBeNull();
    });
  });
});
