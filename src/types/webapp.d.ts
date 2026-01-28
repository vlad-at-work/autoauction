export {};

declare global {
  interface WebAppUser {
    id?: string | number;
    name?: string;
    username?: string;
  }

  interface WebAppInitDataUnsafe {
    user?: WebAppUser;
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
