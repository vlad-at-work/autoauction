'use client';

import { useCallback, useEffect, useRef } from 'react';
import { getWebApp } from '@/app/app/webapp-ready';

/**
 * Hook for platform-aware WebApp UI features (BackButton, haptics, closing confirmation).
 * Works on both MAX and Telegram — methods are no-ops when unsupported.
 */
export function useWebApp() {
  const webApp = typeof window !== 'undefined' ? getWebApp() : undefined;
  const backButtonCbRef = useRef<(() => void) | null>(null);

  // Clean up back button handler on unmount
  useEffect(() => {
    return () => {
      if (backButtonCbRef.current && webApp?.BackButton) {
        webApp.BackButton.offClick(backButtonCbRef.current);
        webApp.BackButton.hide();
        backButtonCbRef.current = null;
      }
    };
  }, [webApp]);

  const showBackButton = useCallback(
    (onClick: () => void) => {
      if (!webApp?.BackButton) return;
      // Remove previous handler if any
      if (backButtonCbRef.current) {
        webApp.BackButton.offClick(backButtonCbRef.current);
      }
      backButtonCbRef.current = onClick;
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    },
    [webApp]
  );

  const hideBackButton = useCallback(() => {
    if (!webApp?.BackButton) return;
    if (backButtonCbRef.current) {
      webApp.BackButton.offClick(backButtonCbRef.current);
      backButtonCbRef.current = null;
    }
    webApp.BackButton.hide();
  }, [webApp]);

  const enableClosingConfirmation = useCallback(() => {
    webApp?.enableClosingConfirmation?.();
  }, [webApp]);

  const disableClosingConfirmation = useCallback(() => {
    webApp?.disableClosingConfirmation?.();
  }, [webApp]);

  const hapticImpact = useCallback(
    (style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'light') => {
      webApp?.HapticFeedback?.impactOccurred(style);
    },
    [webApp]
  );

  const hapticNotification = useCallback(
    (type: 'success' | 'error' | 'warning') => {
      webApp?.HapticFeedback?.notificationOccurred(type);
    },
    [webApp]
  );

  const hapticSelection = useCallback(() => {
    webApp?.HapticFeedback?.selectionChanged();
  }, [webApp]);

  return {
    webApp,
    showBackButton,
    hideBackButton,
    enableClosingConfirmation,
    disableClosingConfirmation,
    hapticImpact,
    hapticNotification,
    hapticSelection,
  };
}
