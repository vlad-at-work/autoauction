'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useDebugMode } from '@/contexts/DebugModeContext';
import { checkBuyerExists } from '@/lib/api/buyers';

type LoadingState = 'loading' | 'checking' | 'redirect';

export default function MiniAppHomePage() {
  const router = useRouter();
  const { debugMode } = useDebugMode();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  useEffect(() => {
    let cancelled = false;

    const detectUserAndRedirect = async () => {
      // If in debug mode, use debug user ID
      if (debugMode.enabled && debugMode.mockUserId) {
        setLoadingState('checking');
        await new Promise((resolve) => setTimeout(resolve, 500)); // Brief delay for UX
        const { exists } = await checkBuyerExists(debugMode.mockUserId, 'max', debugMode);

        if (cancelled) return;

        setLoadingState('redirect');
        if (exists) {
          router.replace('/app/dashboard');
        } else {
          router.replace('/app/form');
        }
        return;
      }

      // Production flow: poll for Max WebApp
      const tryLoadUser = async (attempt = 0) => {
        if (cancelled) return;

        const webApp = window.WebApp;
        const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString();
        const startParam = webApp?.initDataUnsafe?.start_param;

        if (webApp && platformUserId) {
          setLoadingState('checking');

          // Check if buyer exists
          const { exists } = await checkBuyerExists(platformUserId, 'max');

          if (cancelled) return;

          setLoadingState('redirect');

          // Handle deep link
          if (startParam === 'inquiry') {
            router.replace('/app/form');
            return;
          }

          // Redirect based on existence
          if (exists) {
            router.replace('/app/dashboard');
          } else {
            router.replace('/app/form');
          }
          return;
        }

        // Max not loaded yet, keep polling
        if (attempt < 40) {
          window.setTimeout(() => tryLoadUser(attempt + 1), 50);
        } else {
          // Timeout - show error or debug option
          setLoadingState('loading');
        }
      };

      tryLoadUser();
    };

    detectUserAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [router, debugMode]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-muted-foreground size-12 animate-spin" />
        <p className="text-muted-foreground text-sm">
          {loadingState === 'loading' && 'Загрузка...'}
          {loadingState === 'checking' && 'Проверка аккаунта...'}
          {loadingState === 'redirect' && 'Перенаправление...'}
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-muted-foreground text-xs">Режим разработки</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/debug">Открыть Debug режим</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
