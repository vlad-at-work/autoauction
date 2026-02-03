/**
 * Telegram Bot API notification service
 * Sends messages to users via Telegram Bot API
 *
 * Supports both customer and dealer bots:
 * - Customer: TG_BOT_TOKEN (notifications to buyers)
 * - Dealer: TG_BOT_TOKEN_DEALER (notifications to dealers)
 */

const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN;
const TG_BOT_TOKEN_DEALER = process.env.TG_BOT_TOKEN_DEALER;
const TG_API_BASE = 'https://api.telegram.org/bot';

export type TelegramBotType = 'customer' | 'dealer';

function getTelegramToken(botType: TelegramBotType = 'customer'): string | undefined {
  return botType === 'dealer' ? TG_BOT_TOKEN_DEALER : TG_BOT_TOKEN;
}

type SendMessageResult = {
  success: boolean;
  error?: string;
};

interface SendMessagePayload {
  chat_id: string;
  text: string;
  parse_mode: string;
  reply_markup?: Record<string, unknown>;
}

/**
 * Send a text message to a Telegram user
 * @param replyMarkup - Optional inline keyboard markup for buttons
 * @param botType - Which bot to send from ('customer' or 'dealer')
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
  botType: TelegramBotType = 'customer'
): Promise<SendMessageResult> {
  const token = getTelegramToken(botType);
  if (!token) {
    const tokenName = botType === 'dealer' ? 'TG_BOT_TOKEN_DEALER' : 'TG_BOT_TOKEN';
    return { success: false, error: `${tokenName} not configured` };
  }

  try {
    const payload: SendMessagePayload = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(`${TG_API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
 * @param botType - Which bot to send from ('customer' or 'dealer')
 */
export async function sendTelegramMessageWithButton(
  chatId: string,
  text: string,
  buttonText: string,
  buttonUrl: string,
  botType: TelegramBotType = 'customer'
): Promise<SendMessageResult> {
  const token = getTelegramToken(botType);
  if (!token) {
    const tokenName = botType === 'dealer' ? 'TG_BOT_TOKEN_DEALER' : 'TG_BOT_TOKEN';
    return { success: false, error: `${tokenName} not configured` };
  }

  try {
    const response = await fetch(`${TG_API_BASE}${token}/sendMessage`, {
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
