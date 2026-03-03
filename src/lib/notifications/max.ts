/**
 * MAX Platform messaging
 */

import { logger } from '@/lib/logger';

const log = logger.child({ module: 'platform/MAX' });

const MAX_API_BASE = 'https://platform-api.max.ru';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const MAX_BOT_TOKEN_DEALER = process.env.MAX_BOT_TOKEN_DEALER || '';

export type MaxButton =
  | { type: 'open_app'; text: string; web_app?: string | null; payload?: string | null }
  | { type: 'request_contact'; text: string };

export async function sendMaxMessage(
  userId: number | string,
  text: string,
  buttons?: MaxButton[] | MaxButton[][],
  botType: 'customer' | 'dealer' = 'customer'
): Promise<{ success: boolean; error?: string }> {
  const token = botType === 'dealer' ? MAX_BOT_TOKEN_DEALER : MAX_BOT_TOKEN;
  const logContext = {
    platform: 'MAX',
    botType,
    userId: String(userId),
    hasButtons: !!buttons?.length,
  };

  log.info(logContext, '[MAX] Sending message');

  if (!token) {
    log.warn(
      { ...logContext, reason: 'token_missing' },
      '[MAX] Send failed: bot token not configured'
    );
    return { success: false, error: 'Bot token not configured' };
  }

  try {
    const body: {
      text: string;
      attachments?: Array<{
        type: 'inline_keyboard';
        payload: {
          buttons: MaxButton[][];
        };
      }>;
    } = { text };

    if (buttons && buttons.length > 0) {
      // Detect if buttons is 1D or 2D array at runtime
      const is2DArray = Array.isArray(buttons[0]);
      const buttonRows: MaxButton[][] = is2DArray
        ? (buttons as MaxButton[][])
        : [buttons as MaxButton[]];

      body.attachments = [
        {
          type: 'inline_keyboard',
          payload: {
            buttons: buttonRows,
          },
        },
      ];
    }

    const url = `${MAX_API_BASE}/messages?user_id=${Number(userId)}`;
    log.debug({ ...logContext, url, textLength: text.length }, '[MAX] POST request');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseText = await response.text();
      log.error(
        { ...logContext, status: response.status, responseText },
        '[MAX] Send failed: HTTP error'
      );
      return { success: false, error: `HTTP ${response.status}: ${responseText}` };
    }

    log.info({ ...logContext, status: response.status }, '[MAX] Message sent successfully');
    return { success: true };
  } catch (err) {
    log.error({ ...logContext, err: String(err) }, '[MAX] Send failed: exception');
    return { success: false, error: String(err) };
  }
}
