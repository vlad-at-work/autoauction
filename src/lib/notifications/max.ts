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

/**
 * Send a text message to a MAX user
 * Note: MAX API requires chat_id/user_id as query parameters, not in the body
 */
export async function sendMaxMessage(chatId: string, text: string): Promise<SendMessageResult> {
  if (!MAX_BOT_TOKEN || MAX_BOT_TOKEN === '<from_vercel>') {
    return { success: false, error: 'MAX_BOT_TOKEN not configured' };
  }

  try {
    const url = new URL(`${MAX_API_BASE}/messages`);
    url.searchParams.set('chat_id', chatId);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return {
        success: false,
        error: data.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
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
        error: data.message || `HTTP ${response.status}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
