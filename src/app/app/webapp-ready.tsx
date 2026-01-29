'use client';

import { useEffect } from 'react';

/**
 * Helper to get the WebApp object from either MAX or Telegram
 */
export function getWebApp(): WebAppBridge | undefined {
  // Try MAX first (window.WebApp)
  if (typeof window !== 'undefined' && window.WebApp?.initDataUnsafe?.user) {
    return window.WebApp;
  }
  // Try Telegram (window.Telegram.WebApp)
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return window.Telegram.WebApp;
  }
  // Return whichever is available (for ready() call)
  if (typeof window !== 'undefined') {
    return window.WebApp || window.Telegram?.WebApp;
  }
  return undefined;
}

/**
 * Detect which platform the user is on
 */
export function detectPlatform(): 'max' | 'telegram' | null {
  if (typeof window === 'undefined') return null;

  // MAX WebApp sets window.WebApp directly
  if (window.WebApp?.initDataUnsafe?.user) {
    return 'max';
  }
  // Telegram uses window.Telegram.WebApp
  if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
    return 'telegram';
  }
  return null;
}

export function WebAppReady() {
  useEffect(() => {
    let cancelled = false;

    const tryReady = (attempt = 0) => {
      if (cancelled) return;

      const webApp = getWebApp();
      if (webApp?.ready) {
        webApp.ready();
        return;
      }

      if (attempt < 40) {
        window.setTimeout(() => tryReady(attempt + 1), 50);
      }
    };

    tryReady();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
