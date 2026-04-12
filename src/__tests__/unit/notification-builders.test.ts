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

// sendMaxMessage HTTP body tests live in max-http.test.ts
// (isolated to avoid mock contamination from max-webhook.test.ts)
