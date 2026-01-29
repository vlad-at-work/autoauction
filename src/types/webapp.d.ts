export {};

declare global {
  interface WebAppUser {
    id?: string | number;
    name?: string;
    username?: string;
  }

  interface WebAppChat {
    id?: string | number;
    type?: string; // 'private', 'group', 'supergroup', 'channel'
  }

  interface WebAppInitDataUnsafe {
    user?: WebAppUser;
    chat?: WebAppChat;
    start_param?: string;
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

  interface Window {
    WebApp?: WebAppBridge;
  }
}
