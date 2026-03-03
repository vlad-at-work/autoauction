/**
 * Telegram Bot messaging
 *
 * Mirrors src/lib/notifications/max.ts for Telegram Bot API
 */

import { logger } from '@/lib/logger';

const log = logger.child({ module: 'platform/Telegram' });

const TG_API_BASE = 'https://api.telegram.org';
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const TG_BOT_TOKEN_DEALER = process.env.TG_BOT_TOKEN_DEALER || '';

export type TelegramButton = {
  text: string;
  web_app: { url: string };
};

/**
 * Send a message with a ReplyKeyboardMarkup request_contact button.
 * Used to request the user's phone number (mirrors MAX request_contact flow).
 */
export async function sendTelegramContactRequest(
  chatId: number | string,
  text: string,
  buttonText: string = '📱 Поделиться номером',
  botType: 'customer' | 'dealer' = 'customer'
): Promise<{ success: boolean; error?: string }> {
  const token = botType === 'dealer' ? TG_BOT_TOKEN_DEALER : TG_BOT_TOKEN;
  const logContext = {
    platform: 'Telegram',
    botType,
    chatId: String(chatId),
    action: 'contact_request',
  };

  log.info(logContext, '[Telegram] Sending contact request');

  if (!token) {
    log.warn(
      { ...logContext, reason: 'token_missing' },
      '[Telegram] Send failed: bot token not configured'
    );
    return { success: false, error: 'Bot token not configured' };
  }

  const url = `${TG_API_BASE}/bot${token}/sendMessage`;

  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML' as const,
    reply_markup: {
      keyboard: [[{ text: buttonText, request_contact: true }]],
      one_time_keyboard: true,
      resize_keyboard: true,
      is_persistent: true,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(
        { ...logContext, status: response.status, errorText },
        '[Telegram] Contact request send failed: HTTP error'
      );
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    log.info({ ...logContext, status: response.status }, '[Telegram] Contact request sent');
    return { success: true };
  } catch (err) {
    log.error({ ...logContext, err: String(err) }, '[Telegram] Contact request send failed');
    return { success: false, error: String(err) };
  }
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  buttons?: TelegramButton[],
  botType: 'customer' | 'dealer' = 'customer'
): Promise<{ success: boolean; error?: string }> {
  const token = botType === 'dealer' ? TG_BOT_TOKEN_DEALER : TG_BOT_TOKEN;
  const logContext = {
    platform: 'Telegram',
    botType,
    chatId: String(chatId),
    hasButtons: !!buttons?.length,
  };

  log.info(logContext, '[Telegram] Sending message');

  if (!token) {
    log.warn(
      { ...logContext, reason: 'token_missing' },
      '[Telegram] Send failed: bot token not configured'
    );
    return { success: false, error: 'Bot token not configured' };
  }

  const url = `${TG_API_BASE}/bot${token}/sendMessage`;

  const body: {
    chat_id: number | string;
    text: string;
    parse_mode: 'HTML';
    reply_markup?: {
      inline_keyboard: TelegramButton[][];
    };
  } = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
  };

  if (buttons && buttons.length > 0) {
    body.reply_markup = {
      inline_keyboard: [buttons],
    };
  }

  try {
    log.debug({ ...logContext, url, textLength: text.length }, '[Telegram] POST request');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error(
        { ...logContext, status: response.status, errorText },
        '[Telegram] Send failed: HTTP error'
      );
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    log.info({ ...logContext, status: response.status }, '[Telegram] Message sent successfully');
    return { success: true };
  } catch (err) {
    log.error({ ...logContext, err: String(err) }, '[Telegram] Send failed: exception');
    return { success: false, error: String(err) };
  }
}
