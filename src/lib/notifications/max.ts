/**
 * MAX Bot API notification service
 * Sends messages to users via MAX Platform API
 */

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_API_BASE = 'https://platform-api.max.ru';

type SendMessageResult = {
  success: boolean;
  error?: string;
};

/**
 * Send a text message to a MAX user
 */
export async function sendMaxMessage(chatId: string, text: string): Promise<SendMessageResult> {
  if (!MAX_BOT_TOKEN || MAX_BOT_TOKEN === '<from_vercel>') {
    return { success: false, error: 'MAX_BOT_TOKEN not configured' };
  }

  try {
    const response = await fetch(`${MAX_API_BASE}/messages`, {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: parseInt(chatId, 10),
        text,
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

/**
 * Send a message with an inline button that opens the mini-app
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
    const response = await fetch(`${MAX_API_BASE}/messages`, {
      method: 'POST',
      headers: {
        Authorization: MAX_BOT_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: parseInt(chatId, 10),
        text,
        attachments: [
          {
            type: 'inline_keyboard',
            payload: {
              buttons: [
                [
                  {
                    type: 'open_app',
                    text: buttonText,
                    payload: startParam,
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
