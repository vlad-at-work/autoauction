/**
 * MAX Bot API notification service
 * Sends messages to users via MAX Platform API
 */

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_BOT_NAME = process.env.MAX_BOT_NAME || 'AutoAuctionBot';
const MAX_API_BASE = 'https://platform-api.max.ru';

type SendMessageResult = {
  success: boolean;
  error?: string;
};

interface MaxMessagePayload {
  text: string;
  attachments?: Array<Record<string, unknown>>;
}

/**
 * Send a text message to a MAX user
 * Note: MAX API requires chat_id/user_id as query parameters, not in the body
 * @param attachments - Optional inline buttons/attachments
 */
export async function sendMaxMessage(
  chatId: string,
  text: string,
  attachments?: Array<Record<string, unknown>>
): Promise<SendMessageResult> {
  if (!MAX_BOT_TOKEN || MAX_BOT_TOKEN === '<from_vercel>') {
    return { success: false, error: 'MAX_BOT_TOKEN not configured' };
  }

  try {
    const url = new URL(`${MAX_API_BASE}/messages`);
    url.searchParams.set('chat_id', chatId);

    const payload: MaxMessagePayload = { text };
    if (attachments && attachments.length > 0) {
      payload.attachments = attachments;
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (data as Record<string, string>).message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка',
    };
  }
}

/**
 * Send a message with an inline button that opens the mini-app
 * Note: MAX API requires chat_id/user_id as query parameters, not in the body
 * Uses 'link' button type with max.ru bot URL to open mini-app with startapp parameter
 */
export async function sendMaxMessageWithButton(
  chatId: string,
  text: string,
  buttonText: string,
  startParam: string
): Promise<SendMessageResult> {
  if (!MAX_BOT_TOKEN || MAX_BOT_TOKEN === '<from_vercel>') {
    return { success: false, error: 'MAX_BOT_TOKEN not configured' };
  }

  try {
    const url = new URL(`${MAX_API_BASE}/messages`);
    url.searchParams.set('chat_id', chatId);

    // Build the mini-app deep link URL
    const appUrl = `https://max.ru/${MAX_BOT_NAME}?startapp=${encodeURIComponent(startParam)}`;

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        attachments: [
          {
            type: 'inline_keyboard',
            payload: {
              buttons: [
                [
                  {
                    type: 'link',
                    text: buttonText,
                    url: appUrl,
                  },
                ],
              ],
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: (data as Record<string, string>).message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка',
    };
  }
}
