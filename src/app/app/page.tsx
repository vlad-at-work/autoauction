'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { checkBuyerExists } from '@/lib/api/buyers';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { parseStartParam } from '@/lib/deeplinks';

type LoadingState = 'loading' | 'checking' | 'redirect';

export default function MiniAppHomePage() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');

  useEffect(() => {
    let cancelled = false;

    const detectUserAndRedirect = async () => {
      // Poll for WebApp to load (MAX or Telegram)
      const tryLoadUser = async (attempt = 0) => {
        if (cancelled) return;

        const webApp = getWebApp();
        const platform = detectPlatform();
        const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString();
        const initData = webApp?.initData;

        // Get startapp parameter - differs between platforms
        // Telegram: tgWebAppStartParam
        // MAX: startapp
        const initDataUnsafe = webApp?.initDataUnsafe as Record<string, unknown> | undefined;
        const startParam =
          (initDataUnsafe?.tgWebAppStartParam as string | undefined) ||
          (initDataUnsafe?.startapp as string | undefined);

        if (webApp && platformUserId && platform && initData) {
          setLoadingState('checking');

          // Check if buyer exists with server-side validation of initData
          const { exists } = await checkBuyerExists(platformUserId, platform, initData);

          if (cancelled) return;

          setLoadingState('redirect');

          // Handle deep links from notifications
          if (startParam) {
            const { context, resourceId } = parseStartParam(startParam);

            if (context === 'inquiry' && resourceId) {
              // Navigate directly to inquiry
              router.replace(`/app/inquiry/${resourceId}`);
              return;
            }

            if (context === 'offer' && resourceId) {
              // resourceId format: "inquiryId:offerId"
              const [inquiryId, offerId] = resourceId.split(':');
              if (inquiryId && offerId) {
                router.replace(`/app/inquiry/${inquiryId}/offer/${offerId}`);
                return;
              }
            }

            if (context === 'transaction' && resourceId) {
              // Navigate to dashboard with transaction ID
              router.replace(`/app/dashboard?transaction=${resourceId}`);
              return;
            }

            if (context === 'dashboard') {
              router.replace('/app/dashboard');
              return;
            }
          }

          // Default redirect based on existence
          if (exists) {
            router.replace('/app/dashboard');
          } else {
            router.replace('/app/form');
          }
          return;
        }

        // WebApp not loaded yet, keep polling
        if (attempt < 40) {
          window.setTimeout(() => tryLoadUser(attempt + 1), 50);
        } else {
          // Timeout - WebApp not available
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
