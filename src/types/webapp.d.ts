export {};

declare global {
  interface WebAppUser {
    id?: string | number;
    name?: string;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
  }

  interface WebAppChat {
    id?: string | number;
    type?: string; // 'private', 'group', 'supergroup', 'channel'
  }

  interface WebAppInitDataUnsafe {
    user?: WebAppUser;
    chat?: WebAppChat;
    start_param?: string;
    auth_date?: number;
    hash?: string;
  }

  interface WebAppBridge {
    initData?: string;
    initDataUnsafe?: WebAppInitDataUnsafe;
    platform?: string;
    version?: string;
    ready?: () => void;
    close?: () => void;
    requestContact?: () => void;
  }

  // Telegram uses window.Telegram.WebApp
  interface TelegramWebApp {
    WebApp?: WebAppBridge;
  }

  interface Window {
    WebApp?: WebAppBridge; // MAX
    Telegram?: TelegramWebApp; // Telegram
  }
}
