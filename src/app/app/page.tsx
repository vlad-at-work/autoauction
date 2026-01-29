'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { checkBuyerExists } from '@/lib/api/buyers';

type LoadingState = 'loading' | 'checking' | 'redirect';

export default function MiniAppHomePage() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  useEffect(() => {
    let cancelled = false;

    const detectUserAndRedirect = async () => {
      // Poll for Max WebApp to load
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
          // Timeout - Max WebApp not available
          setLoadingState('loading');
        }
      };

      tryLoadUser();
    };

    detectUserAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-muted-foreground size-12 animate-spin" />
        <p className="text-muted-foreground text-sm">
          {loadingState === 'loading' && 'Загрузка...'}
          {loadingState === 'checking' && 'Проверка аккаунта...'}
          {loadingState === 'redirect' && 'Перенаправление...'}
        </p>
      </div>
    </div>
  );
}
