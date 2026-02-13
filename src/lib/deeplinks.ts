/**
 * Deep Links for Telegram and MAX Notifications
 *
 * Generates platform-specific deep links to open the app and navigate to specific sections
 * Used in notification messages to create clickable buttons that redirect users
 */

import { getAppBaseUrl } from '@/lib/app-url';

export type NotificationDeepLink = {
  telegram: string;
  max: string;
};

export type NotificationContext =
  | 'inquiry' // Link to specific inquiry
  | 'offer' // Link to specific offer
  | 'transaction' // Link to accepted transaction
  | 'dashboard'; // Link to main dashboard

type TelegramButton = {
  inline_keyboard: Array<
    Array<{
      text: string;
      web_app: {
        url: string;
      };
    }>
  >;
};

type MaxButton = Array<
  Array<{
    type: string;
    text: string;
  }>
>;

/**
 * Generate deep links for notification messages
 *
 * These links will open the mini-app with specific parameters to navigate
 * directly to the relevant section
 */
export function generateDeepLinks(
  context: NotificationContext,
  resourceId?: string
): NotificationDeepLink {
  // For Telegram: use startapp parameter in deep link
  // Format: https://t.me/<bot>?startapp=<payload>
  // The startapp parameter is passed to the WebApp in WebApp.initDataUnsafe.tgWebAppStartParam
  const telegramBotUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'autoauction_bot';

  // For MAX: use startapp parameter similarly
  // Format: https://max.ru/<bot_name>?startapp=<payload>
  const maxBotName = process.env.NEXT_PUBLIC_MAX_BOT_NAME || 'AutoAuctionBot';

  // Create payload that will be passed to the app
  // Format: "context:resourceId" or just "context" if no resource
  const payload = resourceId ? `${context}:${resourceId}` : context;

  // Telegram deep link
  const telegramLink = `https://t.me/${telegramBotUsername}?startapp=${payload}`;

  // MAX deep link
  const maxLink = `https://max.ru/${maxBotName}?startapp=${payload}`;

  return {
    telegram: telegramLink,
    max: maxLink,
  };
}

/**
 * Generate notification message with inline buttons containing deep links
 *
 * Telegram uses InlineKeyboardMarkup with web_app buttons
 * MAX uses inline buttons with open_app or link buttons
 */
export function createNotificationButtons(
  context: NotificationContext,
  resourceId?: string,
  buttonLabel = '📱 Открыть приложение'
): {
  telegram: TelegramButton;
  max: MaxButton;
} {
  const appUrl = getAppBaseUrl();
  const payload = resourceId ? `${context}:${resourceId}` : context;
  const fullAppUrl = `${appUrl}/app?startapp=${payload}`;

  // Telegram inline keyboard with web_app button
  const telegramButton: TelegramButton = {
    inline_keyboard: [
      [
        {
          text: buttonLabel,
          web_app: {
            url: fullAppUrl,
          },
        },
      ],
    ],
  };

  // MAX inline buttons
  const maxButtons: MaxButton = [
    [
      {
        type: 'open_app',
        text: buttonLabel,
        // For MAX, open_app opens the connected mini-app directly
        // The startapp parameter is handled through the URL in settings
      },
    ],
  ];

  return {
    telegram: telegramButton,
    max: maxButtons,
  };
}

/**
 * Parse startapp parameter in the mini-app
 *
 * This should be called on app initialization to determine navigation
 *
 * Usage in your React/Next component:
 * const startParam = Telegram.WebApp.initDataUnsafe.tgWebAppStartParam
 *                 || WebApp.initDataUnsafe?.start_param;
 * const { context, resourceId } = parseStartParam(startParam);
 */
export function parseStartParam(param?: string): {
  context: NotificationContext | null;
  resourceId: string | null;
} {
  if (!param) {
    return { context: null, resourceId: null };
  }

  const parts = param.split(':');
  const context = parts[0] as NotificationContext;
  const resourceId = parts[1] || null;

  // Validate context
  const validContexts: NotificationContext[] = ['inquiry', 'offer', 'transaction', 'dashboard'];

  if (!validContexts.includes(context)) {
    return { context: null, resourceId: null };
  }

  return { context, resourceId };
}

type NotificationMessageReturn = {
  text: string;
  buttons: ReturnType<typeof createNotificationButtons>;
};

/**
 * Example notification messages with deep links
 */
export function getNotificationMessage(
  context: NotificationContext,
  resourceId?: string,
  data?: Record<string, string>
): NotificationMessageReturn {
  const buttons = createNotificationButtons(context, resourceId);

  let text = '';

  switch (context) {
    case 'inquiry':
      text = `📋 У вас есть новое предложение на вашу заявку!

Нажмите кнопку ниже чтобы посмотреть все предложения и выбрать лучшее.`;
      break;

    case 'offer':
      text = `🎯 ${data?.dealerName || 'Дилер'} отправил вам новое предложение!

Нажмите чтобы посмотреть детали и другие предложения.`;
      break;

    case 'transaction':
      text = `✅ Поздравляем! Вы приняли предложение от дилера.

Откройте приложение чтобы посмотреть детали.`;
      break;

    case 'dashboard':
      text = `🏠 Вернитесь в приложение чтобы управлять своими заявками и предложениями.`;
      break;

    default:
      text = '📱 Откройте приложение AutoAuction';
  }

  return { text, buttons };
}

/**
 * Format notification for sending through bot APIs
 */
export function formatTelegramNotification(
  text: string,
  buttons: ReturnType<typeof createNotificationButtons>
) {
  return {
    text,
    parse_mode: 'HTML',
    reply_markup: buttons.telegram,
  };
}

export function formatMaxNotification(
  text: string,
  buttons: ReturnType<typeof createNotificationButtons>
) {
  return {
    text,
    attachments: buttons.max,
  };
}
