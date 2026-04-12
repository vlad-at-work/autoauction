/**
 * sendMaxMessage HTTP behaviour tests.
 *
 * Kept in a separate file from max-webhook.test.ts so that
 * mock.module('@/lib/notifications/max') in max-webhook.test.ts
 * does not bleed into these tests (bun runs files in alphabetical order;
 * max-http sorts before max-webhook).
 */
import { describe, expect, it } from 'bun:test';

const originalFetch = globalThis.fetch;

describe('sendMaxMessage HTTP body', () => {
  it('sends correct URL and Authorization header', async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    globalThis.fetch = async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    process.env.MAX_BOT_TOKEN = 'test_max_token';
    const { sendMaxMessage } = await import('@/lib/notifications/max');
    await sendMaxMessage(12345, 'hello');

    expect(calls.length).toBeGreaterThanOrEqual(1);
    const last = calls[calls.length - 1];
    expect(last.url).toContain('user_id=12345');
    const auth = (last.init.headers as Record<string, string>)?.['Authorization'];
    expect(auth).toBe('test_max_token');

    globalThis.fetch = originalFetch;
  });

  it('wraps buttons in inline_keyboard attachment', async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    globalThis.fetch = async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(init?.body as string) });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    process.env.MAX_BOT_TOKEN = 'test_max_token';
    const { sendMaxMessage } = await import('@/lib/notifications/max');
    await sendMaxMessage(12345, 'hello', [{ type: 'open_app', text: 'Open', web_app: 'botname' }]);

    const last = calls[calls.length - 1];
    const body = last.body as { attachments?: Array<{ type: string }> };
    expect(body.attachments).toBeDefined();
    expect(body.attachments![0].type).toBe('inline_keyboard');

    globalThis.fetch = originalFetch;
  });

  it('returns success:false when token is missing', async () => {
    const savedToken = process.env.MAX_BOT_TOKEN;
    process.env.MAX_BOT_TOKEN = '';
    const { sendMaxMessage } = await import('@/lib/notifications/max');
    const result = await sendMaxMessage(99, 'test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('token');
    process.env.MAX_BOT_TOKEN = savedToken;
  });
});
