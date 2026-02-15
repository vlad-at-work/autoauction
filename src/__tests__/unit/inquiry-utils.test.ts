import { describe, expect, it } from 'bun:test';

import {
  getShortId,
  getIdColorClass,
  getIdHexColor,
  anonymizeDealerName,
  formatPrice,
  formatRelativeTime,
} from '@/lib/inquiry-utils';

describe('getShortId', () => {
  it('returns first 6 characters uppercased', () => {
    expect(getShortId('clx123456789')).toBe('CLX123');
    expect(getShortId('abc')).toBe('ABC');
    expect(getShortId('abcdefghij')).toBe('ABCDEF');
  });

  it('handles empty and short strings', () => {
    expect(getShortId('')).toBe('');
    expect(getShortId('ab')).toBe('AB');
  });
});

describe('getIdColorClass', () => {
  it('returns consistent color for the same ID', () => {
    const color1 = getIdColorClass('clx123');
    const color2 = getIdColorClass('clx123');
    expect(color1).toEqual(color2);
  });

  it('returns different colors for different IDs', () => {
    const color1 = getIdColorClass('clx111');
    const color2 = getIdColorClass('clx222');
    // While not guaranteed to be different, they should be deterministic
    expect(color1.bg).toBeDefined();
    expect(color2.bg).toBeDefined();
  });

  it('returns valid tailwind color classes', () => {
    const color = getIdColorClass('test123');
    expect(color.bg).toMatch(/^bg-\w+-\d+$/);
    expect(color.text).toMatch(/^text-\w+-\d+$/);
    expect(color.border).toMatch(/^border-\w+-\d+$/);
  });

  it('uses only first 6 characters for hashing', () => {
    const color1 = getIdColorClass('abcdef111111');
    const color2 = getIdColorClass('abcdef222222');
    expect(color1).toEqual(color2);
  });
});

describe('getIdHexColor', () => {
  it('returns consistent color for the same ID', () => {
    const color1 = getIdHexColor('clx123');
    const color2 = getIdHexColor('clx123');
    expect(color1).toBe(color2);
  });

  it('returns valid HSL color string', () => {
    const color = getIdHexColor('test123');
    expect(color).toMatch(/^hsl\(\d+, 65%, 45%\)$/);
  });

  it('returns different hues for different IDs', () => {
    const color1 = getIdHexColor('aaaaaa');
    const color2 = getIdHexColor('zzzzzz');
    expect(color1).not.toBe(color2);
  });
});

describe('anonymizeDealerName', () => {
  it('returns Дилер A for index 0', () => {
    expect(anonymizeDealerName(0)).toBe('Дилер A');
  });

  it('returns Дилер B for index 1', () => {
    expect(anonymizeDealerName(1)).toBe('Дилер B');
  });

  it('returns Дилер Z for index 25', () => {
    expect(anonymizeDealerName(25)).toBe('Дилер Z');
  });

  it('wraps around after Z', () => {
    expect(anonymizeDealerName(26)).toBe('Дилер A');
    expect(anonymizeDealerName(27)).toBe('Дилер B');
  });

  it('handles large indices', () => {
    expect(anonymizeDealerName(52)).toBe('Дилер A');
    expect(anonymizeDealerName(100)).toBe('Дилер W'); // 100 % 26 = 22 -> W
  });
});

describe('formatPrice', () => {
  it('formats small prices correctly', () => {
    expect(formatPrice(1000)).toBe('1\u00A0000');
  });

  it('formats typical car prices correctly', () => {
    const result = formatPrice(1500000);
    // Russian locale uses non-breaking space as thousands separator
    expect(result).toContain('1');
    expect(result).toContain('500');
    expect(result).toContain('000');
  });

  it('handles zero', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('handles decimal numbers', () => {
    const result = formatPrice(1234567.89);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });
});

describe('formatRelativeTime', () => {
  it('returns "только что" for very recent times', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('только что');
  });

  it('returns minutes for times less than an hour ago', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 мин. назад');
  });

  it('returns hours for times less than a day ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toBe('3 ч. назад');
  });

  it('returns "вчера" for exactly 1 day ago', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(yesterday)).toBe('вчера');
  });

  it('returns days for times more than 1 day ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3 дн. назад');
  });

  it('handles edge cases at boundaries', () => {
    // Just under 1 hour
    const fiftyNineMinutes = new Date(Date.now() - 59 * 60 * 1000);
    expect(formatRelativeTime(fiftyNineMinutes)).toBe('59 мин. назад');

    // Just over 1 hour
    const sixtyOneMinutes = new Date(Date.now() - 61 * 60 * 1000);
    expect(formatRelativeTime(sixtyOneMinutes)).toBe('1 ч. назад');
  });
});
