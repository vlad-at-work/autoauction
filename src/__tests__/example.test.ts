import { describe, expect, it } from 'bun:test';

import { getMaxBotUrl } from '../lib/bot-links';

describe('Example tests', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const maxUrl = getMaxBotUrl('inquiry');
    expect(maxUrl).toContain('max.ru');
    expect(maxUrl).toContain('startapp=');
  });
});
