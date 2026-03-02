/**
 * Notifications module - MAX and Telegram Platform implementation
 *
 * Sends notifications via MAX and Telegram bots with deep-link buttons
 */

import type { Platform } from '@prisma/client';
import { logger } from '@/lib/logger';
import { sendMaxMessage, type MaxButton } from './max';
import { sendTelegramMessage, type TelegramButton } from './telegram';

const log = logger.child({ module: 'notifications' });

export type NotifyResult = {
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
  const logContext = {
    flow: 'notify_buyer',
    platform: buyer.platform,
    userId: buyer.platformUserId,
    hasChatId: !!buyer.platformChatId,
  };

  log.info(logContext, '[Notify] Sending buyer notification');

  let result: NotifyResult;

  if (buyer.platform === 'MAX') {
    log.info({ ...logContext, platform: 'MAX' }, '[Notify] Routing to MAX (customer bot)');
    result = await sendMaxMessage(buyer.platformUserId, text, undefined, 'customer');
  } else if (buyer.platform === 'TELEGRAM') {
    log.info(
      { ...logContext, platform: 'Telegram' },
      '[Notify] Routing to Telegram (customer bot)'
    );
    result = await sendTelegramMessage(buyer.platformUserId, text, undefined, 'customer');
  } else {
    log.warn(
      { ...logContext, platform: buyer.platform },
      '[Notify] Unknown platform for buyer notification'
    );
    return { success: true };
  }

  if (result.success) {
    log.info({ ...logContext, status: 'success' }, '[Notify] Buyer notification sent successfully');
  } else {
    log.error(
      { ...logContext, status: 'failed', error: result.error },
      '[Notify] Buyer notification failed'
    );
  }

  return result;
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
  const dealerDisplayName = dealerName || 'Дилер';
  const logContext = {
    flow: 'notify_buyer_new_offer',
    platform: buyer.platform,
    userId: buyer.platformUserId,
    inquiryId,
    offerId,
    dealerName: dealerDisplayName,
    isFirstOffer,
  };

  log.info(logContext, '[Notify] Sending buyer new offer notification');

  const text = `🚗 Предложение от ${dealerDisplayName}\n\n${carModel} ${carSubmodel}\n${price.toLocaleString('ru-RU')} ₽`;
  const payload = `offer_${inquiryId}_${offerId}`;

  let result: NotifyResult;

  if (buyer.platform === 'MAX') {
    log.info({ ...logContext, platform: 'MAX' }, '[Notify] Routing to MAX (customer bot)');
    const buttons: MaxButton[] = [
      {
        type: 'open_app',
        text: 'Посмотреть предложение',
        web_app: MAX_BOT_NAME,
        payload,
      },
    ];
    result = await sendMaxMessage(buyer.platformUserId, text, buttons, 'customer');
  } else if (buyer.platform === 'TELEGRAM') {
    log.info(
      { ...logContext, platform: 'Telegram' },
      '[Notify] Routing to Telegram (customer bot)'
    );
    const buttons: TelegramButton[] = [
      {
        text: 'Посмотреть предложение',
        web_app: {
          url: `${APP_URL}/app?startapp=${payload}`,
        },
      },
    ];
    result = await sendTelegramMessage(buyer.platformUserId, text, buttons, 'customer');
  } else {
    log.warn(
      { ...logContext, platform: buyer.platform },
      '[Notify] Unknown buyer platform, skipping notification'
    );
    return { success: true };
  }

  if (result.success) {
    log.info({ ...logContext, status: 'success' }, '[Notify] Buyer notified of new offer');
  } else {
    log.error(
      { ...logContext, status: 'failed', error: result.error },
      '[Notify] Failed to notify buyer of new offer'
    );
  }

  return result;
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
  log.info(
    {
      flow: 'notify_dealer_new_inquiry',
      platform: dealer.platform,
      userId: dealer.platformUserId,
      inquiryId,
      carModel,
    },
    '[Notify] Sending dealer new inquiry notification'
  );

  const text = `🚗 Новая заявка!\n\n${carModel} ${carSubmodel}\nКПП: ${transmission}\nЦвет: ${color}`;
  const payload = `inquiry_${inquiryId}`;

  let result: NotifyResult;

  if (dealer.platform === 'MAX' && dealer.platformUserId) {
    log.info(
      { platform: 'MAX', userId: dealer.platformUserId },
      '[Notify] Routing to MAX (dealer bot)'
    );
    const buttons: MaxButton[] = [
      {
        type: 'open_app',
        text: 'Открыть заявку',
        web_app: MAX_BOT_NAME_DEALER,
        payload,
      },
    ];
    result = await sendMaxMessage(dealer.platformUserId, text, buttons, 'dealer');
  } else if (dealer.platform === 'TELEGRAM' && dealer.platformUserId) {
    log.info(
      { platform: 'Telegram', userId: dealer.platformUserId },
      '[Notify] Routing to Telegram (dealer bot)'
    );
    const buttons: TelegramButton[] = [
      {
        text: 'Открыть заявку',
        web_app: {
          url: `${APP_URL}/dealerinterface?startapp=${payload}`,
        },
      },
    ];
    result = await sendTelegramMessage(dealer.platformUserId, text, buttons, 'dealer');
  } else {
    log.warn(
      { platform: dealer.platform, inquiryId },
      '[Notify] Dealer platform not configured, skipping notification'
    );
    return { success: true };
  }

  if (result.success) {
    log.info(
      {
        flow: 'notify_dealer_new_inquiry',
        platform: dealer.platform,
        userId: dealer.platformUserId,
        inquiryId,
      },
      '[Notify] Dealer notified of new inquiry'
    );
  } else {
    log.error(
      {
        flow: 'notify_dealer_new_inquiry',
        platform: dealer.platform,
        userId: dealer.platformUserId,
        inquiryId,
        error: result.error,
      },
      '[Notify] Failed to notify dealer of new inquiry'
    );
  }

  return result;
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
  const logContext = {
    flow: 'notify_dealer_offer_accepted',
    platform: dealer.platform,
    userId: dealer.platformUserId,
    inquiryId,
    carModel,
  };

  log.info(logContext, '[Notify] Sending dealer offer accepted notification');

  const text =
    `🎉 Ваше предложение принято!\n\n` +
    `${carModel} ${carSubmodel}\n` +
    `${price.toLocaleString('ru-RU')} ₽\n\n` +
    `Покупатель: ${buyerName}\n` +
    `Телефон: ${buyerPhone}`;
  const payload = `accepted_${inquiryId}`;

  let result: NotifyResult;

  if (dealer.platform === 'MAX' && dealer.platformUserId) {
    log.info({ ...logContext, platform: 'MAX' }, '[Notify] Routing to MAX (dealer bot)');
    const buttons: MaxButton[] = [
      {
        type: 'open_app',
        text: 'Открыть сделку',
        web_app: MAX_BOT_NAME_DEALER,
        payload,
      },
    ];
    result = await sendMaxMessage(dealer.platformUserId, text, buttons, 'dealer');
  } else if (dealer.platform === 'TELEGRAM' && dealer.platformUserId) {
    log.info({ ...logContext, platform: 'Telegram' }, '[Notify] Routing to Telegram (dealer bot)');
    const buttons: TelegramButton[] = [
      {
        text: 'Открыть сделку',
        web_app: {
          url: `${APP_URL}/dealerinterface?startapp=${payload}`,
        },
      },
    ];
    result = await sendTelegramMessage(dealer.platformUserId, text, buttons, 'dealer');
  } else {
    log.warn(
      { ...logContext, platform: dealer.platform, hasUserId: !!dealer.platformUserId },
      '[Notify] Dealer platform not configured, skipping acceptance notification'
    );
    return { success: true };
  }

  if (result.success) {
    log.info({ ...logContext, status: 'success' }, '[Notify] Dealer notified of accepted offer');
  } else {
    log.error(
      { ...logContext, status: 'failed', error: result.error },
      '[Notify] Failed to notify dealer of accepted offer'
    );
  }

  return result;
}
