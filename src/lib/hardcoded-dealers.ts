/**
 * Hardcoded dealers configuration
 * These dealers receive notifications for all new inquiries
 */

import type { Platform } from '@prisma/client';

export type HardcodedDealer = {
  username: string;
  name: string;
  platform: Platform;
  platformUserId: string; // Telegram user ID or MAX user ID
  platformChatId?: string; // For sending notifications
  active: boolean;
};

/**
 * List of hardcoded dealers that should receive notifications for all inquiries.
 * Add/remove dealers here as needed.
 */
export const HARDCODED_DEALERS: HardcodedDealer[] = [
  // Example dealers - update these with real dealer information
  {
    username: 'autovaz_d7291',
    name: 'АвтоВАЗ Дилер',
    platform: 'TELEGRAM',
    platformUserId: 'TELEGRAM_USER_ID_1', // Replace with actual Telegram user ID
    platformChatId: 'TELEGRAM_CHAT_ID_1', // Replace with actual chat ID
    active: true,
  },
  {
    username: 'vazauto_d4856',
    name: 'ВАЗАвто',
    platform: 'TELEGRAM',
    platformUserId: 'TELEGRAM_USER_ID_2', // Replace with actual Telegram user ID
    platformChatId: 'TELEGRAM_CHAT_ID_2', // Replace with actual chat ID
    active: true,
  },
  // Add more dealers here as needed
];

/**
 * Get all active hardcoded dealers
 */
export function getActiveHardcodedDealers(): HardcodedDealer[] {
  return HARDCODED_DEALERS.filter((dealer) => dealer.active);
}

/**
 * Get hardcoded dealer by username
 */
export function getHardcodedDealerByUsername(username: string): HardcodedDealer | undefined {
  return HARDCODED_DEALERS.find((dealer) => dealer.username === username);
}
