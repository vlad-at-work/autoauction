/**
 * MAX Bot API notification service
 * Sends messages to users via MAX Platform API
 *
 * Supports both customer and dealer bots:
 * - Customer: MAX_BOT_TOKEN (notifications to buyers)
 * - Dealer: MAX_BOT_TOKEN_DEALER (notifications to dealers)
 */

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN;
const MAX_BOT_TOKEN_DEALER = process.env.MAX_BOT_TOKEN_DEALER;
const MAX_BOT_NAME = process.env.MAX_BOT_NAME || 'AutoAuctionBot';
const MAX_BOT_NAME_DEALER = process.env.MAX_BOT_NAME_DEALER || 'AutoAuctionDealerBot';
const MAX_API_BASE = 'https://platform-api.max.ru';

export type MaxBotType = 'customer' | 'dealer';

function getMaxToken(botType: MaxBotType = 'customer'): string | undefined {
  return botType === 'dealer' ? MAX_BOT_TOKEN_DEALER : MAX_BOT_TOKEN;
}

function getMaxBotName(botType: MaxBotType = 'customer'): string {
  return botType === 'dealer' ? MAX_BOT_NAME_DEALER : MAX_BOT_NAME;
}

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
 * @param botType - Which bot to send from ('customer' or 'dealer')
 */
export async function sendMaxMessage(
  chatId: string,
  text: string,
  attachments?: Array<Record<string, unknown>>,
  botType: MaxBotType = 'customer'
): Promise<SendMessageResult> {
  const token = getMaxToken(botType);
  if (!token || token === '<from_vercel>') {
    const tokenName = botType === 'dealer' ? 'MAX_BOT_TOKEN_DEALER' : 'MAX_BOT_TOKEN';
    return { success: false, error: `${tokenName} not configured` };
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
        Authorization: token,
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
 * @param botType - Which bot to send from ('customer' or 'dealer')
 */
export async function sendMaxMessageWithButton(
  chatId: string,
  text: string,
  buttonText: string,
  startParam: string,
  botType: MaxBotType = 'customer'
): Promise<SendMessageResult> {
  const token = getMaxToken(botType);
  const botName = getMaxBotName(botType);
  if (!token || token === '<from_vercel>') {
    const tokenName = botType === 'dealer' ? 'MAX_BOT_TOKEN_DEALER' : 'MAX_BOT_TOKEN';
    return { success: false, error: `${tokenName} not configured` };
  }

  try {
    const url = new URL(`${MAX_API_BASE}/messages`);
    url.searchParams.set('chat_id', chatId);

    // Build the mini-app deep link URL
    const appUrl = `https://max.ru/${botName}?startapp=${encodeURIComponent(startParam)}`;

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: token,
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
