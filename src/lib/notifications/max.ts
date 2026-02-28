/**
 * MAX Platform messaging
 */

import { logger } from '@/lib/logger';

const log = logger.child({ module: 'notifications/max' });

const MAX_API_BASE = 'https://platform-api.max.ru';
const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const MAX_BOT_TOKEN_DEALER = process.env.MAX_BOT_TOKEN_DEALER || '';

export type MaxButton = {
  type: 'open_app';
  text: string;
  web_app?: string | null;
  payload?: string | null;
};

export async function sendMaxMessage(
  userId: number | string,
  text: string,
  buttons?: MaxButton[],
  botType: 'customer' | 'dealer' = 'customer'
): Promise<{ success: boolean; error?: string }> {
  const token = botType === 'dealer' ? MAX_BOT_TOKEN_DEALER : MAX_BOT_TOKEN;

  if (!token || token === '<from_vercel>') {
    log.warn({ botType }, 'bot token not configured');
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
      body.attachments = [
        {
          type: 'inline_keyboard',
          payload: {
            buttons: [buttons],
          },
        },
      ];
    }

    const response = await fetch(`${MAX_API_BASE}/messages?user_id=${Number(userId)}`, {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseText = await response.text();
      log.error({ status: response.status, responseText }, 'send failed');
      return { success: false, error: `HTTP ${response.status}: ${responseText}` };
    }

    return { success: true };
  } catch (err) {
    log.error({ err }, 'send error');
    return { success: false, error: String(err) };
  }
}
