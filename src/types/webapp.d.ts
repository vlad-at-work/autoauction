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
    tgWebAppStartParam?: string;
    auth_date?: number;
    hash?: string;
  }

  interface WebAppBackButton {
    isVisible: boolean;
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  }

  interface WebAppHapticFeedback {
    impactOccurred(style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid'): void;
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  }

  interface WebAppBridge {
    initData?: string;
    initDataUnsafe?: WebAppInitDataUnsafe;
    platform?: string;
    version?: string;
    ready?: () => void;
    close?: () => void;
    requestContact?: () => void;
    BackButton?: WebAppBackButton;
    HapticFeedback?: WebAppHapticFeedback;
    enableClosingConfirmation?: () => void;
    disableClosingConfirmation?: () => void;
    expand?: () => void;
    isExpanded?: boolean;
    setHeaderColor?: (color: string) => void;
    setBackgroundColor?: (color: string) => void;
    colorScheme?: 'light' | 'dark';
    themeParams?: Record<string, string>;
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
