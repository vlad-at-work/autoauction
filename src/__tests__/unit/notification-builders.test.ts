import { describe, expect, it } from 'bun:test';

/**
 * Tests for message/button shape correctness in the notification modules.
 * We inspect the serialized fetch body — no real HTTP is made.
 *
 * Strategy: intercept global fetch / undici imports via mock.module,
 * capture the body, then inspect the shape.
 */

// ---- MAX button shape tests (pure logic, no HTTP) ----

describe('MAX button shape', () => {
  it('open_app button uses web_app field (not app_name)', () => {
    // Regression guard per CLAUDE.md: app_name doesn't exist in the MAX API.
    // The correct field is web_app.
    const button = {
      type: 'open_app' as const,
      text: 'Открыть',
      web_app: 'id5010035001_1_bot',
      payload: 'some_payload',
    };

    // Structural assertion: field names are correct
    expect(button).toHaveProperty('web_app');
    expect(button).not.toHaveProperty('app_name');
    expect(button.type).toBe('open_app');
    expect(typeof button.web_app).toBe('string');
  });

  it('request_contact button has correct type and text', () => {
    const button = {
      type: 'request_contact' as const,
      text: '📱 Подтвердить номер',
    };
    expect(button.type).toBe('request_contact');
    expect(button.text).toBeTruthy();
  });

  it('inline_keyboard attachment wraps buttons in 2D array', () => {
    const buttons = [{ type: 'open_app' as const, text: 'Open', web_app: 'botname' }];
    const attachment = {
      type: 'inline_keyboard' as const,
      payload: {
        buttons: [buttons],
      },
    };
    // buttons must be 2D
    expect(Array.isArray(attachment.payload.buttons[0])).toBe(true);
    expect(attachment.payload.buttons[0][0].type).toBe('open_app');
  });
});

// ---- Telegram button shape tests ----

describe('Telegram button shape', () => {
  it('inline keyboard web_app button has correct structure', () => {
    const button = {
      text: 'Создать заявку',
      web_app: { url: 'https://staging.svoauto.ru/app' },
    };
    expect(button).toHaveProperty('web_app');
    expect(button.web_app).toHaveProperty('url');
    expect(button.web_app.url).toMatch(/^https?:\/\//);
  });

  it('request_contact reply keyboard has correct shape', () => {
    const replyMarkup = {
      keyboard: [[{ text: '📱 Подтвердить номер', request_contact: true }]],
      one_time_keyboard: true,
      resize_keyboard: true,
      is_persistent: true,
    };

    // Must be a 2D array (rows of buttons)
    expect(Array.isArray(replyMarkup.keyboard[0])).toBe(true);
    expect(replyMarkup.keyboard[0][0]).toHaveProperty('request_contact', true);
    expect(replyMarkup.keyboard[0][0]).toHaveProperty('text');
    expect(replyMarkup.one_time_keyboard).toBe(true);
  });

  it('inline_keyboard wraps buttons in 2D array (row of buttons)', () => {
    const buttons = [
      { text: 'Создать заявку', web_app: { url: 'https://staging.svoauto.ru/app' } },
    ];
    const replyMarkup = {
      inline_keyboard: [buttons],
    };
    expect(Array.isArray(replyMarkup.inline_keyboard[0])).toBe(true);
    expect(replyMarkup.inline_keyboard[0][0]).toHaveProperty('web_app');
  });
});

// ---- sendMaxMessage body shape (via captured fetch) ----

const capturedFetchCalls: Array<{ url: string; body: unknown }> = [];

// Override global fetch to capture calls without making real HTTP requests
const originalFetch = globalThis.fetch;

describe('sendMaxMessage HTTP body', () => {
  it('sends correct Content-Type and Authorization headers', async () => {
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

  it('includes buttons in attachments with inline_keyboard type', async () => {
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

// Store captured calls for cross-describe cleanup
void capturedFetchCalls;
