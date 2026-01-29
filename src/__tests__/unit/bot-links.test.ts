import { describe, expect, it } from 'bun:test';

import { getMaxBotUrl, getTelegramBotUrl } from '@/lib/bot-links';

describe('bot links', () => {
  it('builds a MAX startapp URL with a default bot name', () => {
    const prev = process.env.NEXT_PUBLIC_MAX_BOT_NAME;
    try {
      delete process.env.NEXT_PUBLIC_MAX_BOT_NAME;
      expect(getMaxBotUrl('inquiry')).toBe('https://max.ru/id5010035001_bot?startapp=inquiry');
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_MAX_BOT_NAME;
      else process.env.NEXT_PUBLIC_MAX_BOT_NAME = prev;
    }
  });

  it('URL-encodes the startapp payload', () => {
    const url = getMaxBotUrl('a b?c=1');
    expect(url).toContain('startapp=a%20b%3Fc%3D1');
  });

  it('returns null for Telegram when bot name is missing', () => {
    const prev = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    try {
      delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
      expect(getTelegramBotUrl('inquiry')).toBe(null);
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
      else process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME = prev;
    }
  });

  it('builds a Telegram startapp URL when bot name is set', () => {
    const prev = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
    try {
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME = 'my_test_bot';
      expect(getTelegramBotUrl('inquiry')).toBe('https://t.me/my_test_bot?startapp=inquiry');
    } finally {
      if (prev === undefined) delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME;
      else process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME = prev;
    }
  });
});
