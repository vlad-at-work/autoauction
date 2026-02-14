/**
 * Notifications module - MAX Platform implementation
 *
 * Sends notifications via MAX bot with open_app deep-link buttons
 */

import type { Platform } from '@prisma/client';
import { sendMaxMessage, type MaxButton } from './max';

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

/**
 * Send plain text message to buyer
 */
export async function notifyBuyer(buyer: BuyerInfo, text: string): Promise<NotifyResult> {
  if (buyer.platform !== 'MAX') {
    // Telegram deferred for now
    return { success: true };
  }

  return sendMaxMessage(buyer.platformUserId, text, undefined, 'customer');
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
  isFirstOffer: boolean,
  dealerName?: string
): Promise<NotifyResult> {
  if (buyer.platform !== 'MAX') {
    return { success: true };
  }

  const dealerText = dealerName ? ` от ${dealerName}` : '';
  const firstOfferText = isFirstOffer ? 'Первое предложение!' : 'Новое предложение!';

  const text = `${firstOfferText}${dealerText}\n\n🚗 ${carModel} ${carSubmodel}\n💰 ${price.toLocaleString('ru-RU')} ₽`;

  const buttons: MaxButton[] = [
    {
      type: 'open_app',
      text: 'Посмотреть предложение',
      web_app: MAX_BOT_NAME,
      payload: `offer_${inquiryId}_${offerId}`,
    },
  ];

  return sendMaxMessage(buyer.platformUserId, text, buttons, 'customer');
}

/**
 * Send password reset code to dealer (text only)
 */
export async function sendDealerPasswordResetCode(
  dealer: DealerInfo,
  code: string
): Promise<NotifyResult> {
  if (dealer.platform !== 'MAX' || !dealer.platformUserId) {
    return { success: true };
  }

  const text = `🔐 Код для сброса пароля: ${code}\n\nКод действителен 10 минут.`;

  return sendMaxMessage(dealer.platformUserId, text, undefined, 'dealer');
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
  if (dealer.platform !== 'MAX' || !dealer.platformUserId) {
    return { success: true };
  }

  const text = `📋 Новая заявка!\n\n🚗 ${carModel} ${carSubmodel}\n⚙️ КПП: ${transmission}\n🎨 Цвет: ${color}`;

  const buttons: MaxButton[] = [
    {
      type: 'open_app',
      text: 'Открыть заявку',
      web_app: MAX_BOT_NAME_DEALER,
      payload: `inquiry_${inquiryId}`,
    },
  ];

  return sendMaxMessage(dealer.platformUserId, text, buttons, 'dealer');
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
  if (dealer.platform !== 'MAX' || !dealer.platformUserId) {
    return { success: true };
  }

  const text =
    `🎉 Ваше предложение принято!\n\n` +
    `🚗 ${carModel} ${carSubmodel}\n` +
    `💰 ${price.toLocaleString('ru-RU')} ₽\n\n` +
    `👤 Покупатель: ${buyerName}\n` +
    `📞 Телефон: ${buyerPhone}`;

  const buttons: MaxButton[] = [
    {
      type: 'open_app',
      text: 'Открыть сделку',
      web_app: MAX_BOT_NAME_DEALER,
      payload: `accepted_${inquiryId}`,
    },
  ];

  return sendMaxMessage(dealer.platformUserId, text, buttons, 'dealer');
}
