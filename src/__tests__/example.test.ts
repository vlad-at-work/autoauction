import { describe, expect, it } from 'bun:test';

describe('Example tests', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    const botName = 'autoauction_bot';
    const maxUrl = `https://max.ru/${botName}?startapp=inquiry`;
    expect(maxUrl).toContain('max.ru');
    expect(maxUrl).toContain('startapp=');
  });
});
