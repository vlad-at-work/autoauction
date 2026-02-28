/**
 * Notifications module - MAX and Telegram Platform implementation
 *
 * Sends notifications via MAX and Telegram bots with deep-link buttons
 */

import type { Platform } from '@prisma/client';
import { sendMaxMessage, type MaxButton } from './max';
import { sendTelegramMessage, type TelegramButton } from './telegram';

type NotifyResult = {
  success: boolean;
  error?: string;
};

type BuyerInfo = {
  platform: Platform;
  platformChatId: string | null;
  platformUserId: string;
};

type DealerInfo = {
  platform: Platform;
  platformChatId?: string | null;
  platformUserId?: string | null;
};

// Bot names for deep links
const MAX_BOT_NAME = process.env.MAX_BOT_NAME || process.env.NEXT_PUBLIC_MAX_BOT_NAME || '';
const MAX_BOT_NAME_DEALER =
  process.env.MAX_BOT_NAME_DEALER || process.env.NEXT_PUBLIC_MAX_BOT_NAME_DEALER || '';
// App URL for Telegram web_app buttons
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Send plain text message
 */
export async function notifyBuyer(buyer: BuyerInfo, text: string): Promise<NotifyResult> {
  if (buyer.platform === 'MAX') {
    return sendMaxMessage(buyer.platformUserId, text, undefined, 'customer');
  } else if (buyer.platform === 'TELEGRAM') {
    return sendTelegramMessage(buyer.platformUserId, text, undefined, 'customer');
  }
  return { success: true };
}

/**
 * Notify buyer of new offer with deep link button
 */
export async function notifyBuyerOfNewOffer(
  buyer: BuyerInfo,
  inquiryId: string,
  offerId: string,
  carModel: string,
  carSubmodel: string,
  price: number,
  _isFirstOffer: boolean,
  dealerName?: string
): Promise<NotifyResult> {
  const dealerDisplayName = dealerName || 'Дилер';
  const text = `🚗 Предложение от ${dealerDisplayName}\n\n${carModel} ${carSubmodel}\n${price.toLocaleString('ru-RU')} \u20BD`;
  const payload = `offer_${inquiryId}_${offerId}`;

  if (buyer.platform === 'MAX') {
    const buttons: MaxButton[] = [
      {
        type: 'open_app',
        text: 'Посмотреть предложение',
        web_app: MAX_BOT_NAME,
        payload,
      },
    ];
    return sendMaxMessage(buyer.platformUserId, text, buttons, 'customer');
  } else if (buyer.platform === 'TELEGRAM') {
    const buttons: TelegramButton[] = [
      {
        text: 'Посмотреть предложение',
        web_app: {
          url: `${APP_URL}/app?startapp=${payload}`,
        },
      },
    ];
    return sendTelegramMessage(buyer.platformUserId, text, buttons, 'customer');
  }
  return { success: true };
}

/**
 * Send password reset code to dealer (text only)
 */
export async function sendDealerPasswordResetCode(
  dealer: DealerInfo,
  code: string
): Promise<NotifyResult> {
  const text = `🔐 Код для сброса пароля: ${code}\n\nКод действителен 10 минут.`;

  if (dealer.platform === 'MAX' && dealer.platformUserId) {
    return sendMaxMessage(dealer.platformUserId, text, undefined, 'dealer');
  } else if (dealer.platform === 'TELEGRAM' && dealer.platformUserId) {
    return sendTelegramMessage(dealer.platformUserId, text, undefined, 'dealer');
  }
  return { success: true };
}

/**
 * Notify dealer of new inquiry with deep link button
 */
export async function notifyDealerOfNewInquiryViaBot(
  dealer: DealerInfo,
  inquiryId: string,
  carModel: string,
  carSubmodel: string,
  transmission: string,
  color: string
): Promise<NotifyResult> {
  const text = `🚗 Новая заявка!\n\n${carModel} ${carSubmodel}\nКПП: ${transmission}\nЦвет: ${color}`;
  const payload = `inquiry_${inquiryId}`;

  if (dealer.platform === 'MAX' && dealer.platformUserId) {
    const buttons: MaxButton[] = [
      {
        type: 'open_app',
        text: 'Открыть заявку',
        web_app: MAX_BOT_NAME_DEALER,
        payload,
      },
    ];
    return sendMaxMessage(dealer.platformUserId, text, buttons, 'dealer');
  } else if (dealer.platform === 'TELEGRAM' && dealer.platformUserId) {
    const buttons: TelegramButton[] = [
      {
        text: 'Открыть заявку',
        web_app: {
          url: `${APP_URL}/dealerinterface?startapp=${payload}`,
        },
      },
    ];
    return sendTelegramMessage(dealer.platformUserId, text, buttons, 'dealer');
  }
  return { success: true };
}

/**
 * Notify dealer that their offer was accepted with buyer contact info
 */
export async function notifyDealerOfAcceptedOfferViaBot(
  dealer: DealerInfo,
  inquiryId: string,
  carModel: string,
  carSubmodel: string,
  price: number,
  buyerName: string,
  buyerPhone: string
): Promise<NotifyResult> {
  const text =
    `🎉 Ваше предложение принято!\n\n` +
    `${carModel} ${carSubmodel}\n` +
    `${price.toLocaleString('ru-RU')} \u20BD\n\n` +
    `Покупатель: ${buyerName}\n` +
    `Телефон: ${buyerPhone}`;
  const payload = `accepted_${inquiryId}`;

  if (dealer.platform === 'MAX' && dealer.platformUserId) {
    const buttons: MaxButton[] = [
      {
        type: 'open_app',
        text: 'Открыть сделку',
        web_app: MAX_BOT_NAME_DEALER,
        payload,
      },
    ];
    return sendMaxMessage(dealer.platformUserId, text, buttons, 'dealer');
  } else if (dealer.platform === 'TELEGRAM' && dealer.platformUserId) {
    const buttons: TelegramButton[] = [
      {
        text: 'Открыть сделку',
        web_app: {
          url: `${APP_URL}/dealerinterface?startapp=${payload}`,
        },
      },
    ];
    return sendTelegramMessage(dealer.platformUserId, text, buttons, 'dealer');
  }
  return { success: true };
}
