'use client';

import { useEffect } from 'react';

export function MaxWebAppReady() {
  useEffect(() => {
    let cancelled = false;

    const tryReady = (attempt = 0) => {
      if (cancelled) return;

      const webApp = window.WebApp;
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
