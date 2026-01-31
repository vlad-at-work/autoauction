/**
 * Telegram Bot API notification service
 * Sends messages to users via Telegram Bot API
 */

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_API_BASE = 'https://api.telegram.org/bot';

type SendMessageResult = {
  success: boolean;
  error?: string;
};

/**
 * Send a text message to a Telegram user
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string
): Promise<SendMessageResult> {
  if (!TG_BOT_TOKEN) {
    return { success: false, error: 'TG_BOT_TOKEN not configured' };
  }

  try {
    const response = await fetch(`${TG_API_BASE}${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
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
 * Send a message with an inline keyboard button
 */
export async function sendTelegramMessageWithButton(
  chatId: string,
  text: string,
  buttonText: string,
  buttonUrl: string
): Promise<SendMessageResult> {
  if (!TG_BOT_TOKEN) {
    return { success: false, error: 'TG_BOT_TOKEN not configured' };
  }

  try {
    const response = await fetch(`${TG_API_BASE}${TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: buttonText,
                url: buttonUrl,
              },
            ],
          ],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return {
        success: false,
        error: data.description || `HTTP ${response.status}`,
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
