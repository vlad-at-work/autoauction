'use client';

import { Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { checkBuyerExists } from '@/lib/api/buyers';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { parseStartParam } from '@/lib/deeplinks';

type LoadingState = 'loading' | 'checking' | 'redirect' | 'phone_required' | 'error';

export default function MiniAppHomePage() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const detectUserAndRedirect = async () => {
      // Poll for WebApp to load (MAX or Telegram)
      const tryLoadUser = async (attempt = 0) => {
        if (cancelled) return;

        console.log('[/app] Attempt', attempt, 'to load WebApp');

        const webApp = getWebApp();
        const platform = detectPlatform();
        const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString();
        const initData = webApp?.initData;

        console.log('[/app] WebApp detected:', {
          platform,
          platformUserId,
          hasInitData: !!initData,
          attempt,
        });

        // Get startapp parameter - differs between platforms
        // Telegram: tgWebAppStartParam
        // MAX: start_param (in initDataUnsafe) or startapp (in URL)
        // Also check URL query params (for web_app buttons)
        const initDataUnsafe = webApp?.initDataUnsafe as Record<string, unknown> | undefined;
        let startParam =
          (initDataUnsafe?.tgWebAppStartParam as string | undefined) ||
          (initDataUnsafe?.start_param as string | undefined);

        // Fallback: read from URL query parameter
        if (!startParam && typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          startParam = params.get('startapp') || undefined;
        }

        console.log('[/app] Start param:', startParam);

        if (webApp && platformUserId && platform && initData) {
          setLoadingState('checking');
          console.log('[/app] Checking if buyer exists...');

          try {
            // Check if buyer exists with server-side validation of initData
            // Add timeout to prevent infinite hang
            const timeoutPromise = new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout checking buyer')), 10000)
            );

            const checkPromise = checkBuyerExists(platformUserId, platform, initData);
            const { exists, data } = await Promise.race([checkPromise, timeoutPromise]);

            console.log('[/app] Buyer exists:', exists, 'phoneVerified:', data?.phoneVerified);

            if (cancelled) return;

            // MAX-only gate: require phone verification before entering the app
            if (platform === 'max' && (!exists || !data?.phoneVerified)) {
              setLoadingState('phone_required');
              return;
            }

            setLoadingState('redirect');

            // Handle deep links from notifications
            if (startParam) {
              const { context, resourceId } = parseStartParam(startParam);
              console.log('[/app] Deep link parsed:', { context, resourceId });

              if (context === 'inquiry' && resourceId) {
                // Navigate directly to inquiry
                console.log('[/app] Navigating to inquiry:', resourceId);
                router.replace(`/app/inquiry/${resourceId}`);
                return;
              }

              if (context === 'offer' && resourceId) {
                // resourceId format: "inquiryId_offerId" (MAX-compatible) or "inquiryId:offerId" (legacy)
                const [inquiryId, offerId] = resourceId.includes('_')
                  ? resourceId.split('_')
                  : resourceId.split(':');
                if (inquiryId && offerId) {
                  console.log('[/app] Navigating to offer:', { inquiryId, offerId });
                  router.replace(`/app/inquiry/${inquiryId}/offer/${offerId}`);
                  return;
                }
              }

              if (context === 'transaction' && resourceId) {
                // Navigate to dashboard with transaction ID
                console.log('[/app] Navigating to dashboard with transaction:', resourceId);
                router.replace(`/app/dashboard?transaction=${resourceId}`);
                return;
              }

              if (context === 'dashboard') {
                console.log('[/app] Navigating to dashboard');
                router.replace('/app/dashboard');
                return;
              }

              if (context === 'form') {
                console.log('[/app] Navigating to form');
                router.replace('/app/form?new=1');
                return;
              }
            }

            // Default redirect based on existence
            if (exists) {
              console.log('[/app] Buyer exists, navigating to dashboard');
              router.replace('/app/dashboard');
            } else {
              console.log('[/app] Buyer does not exist, navigating to form');
              router.replace('/app/form');
            }
            return;
          } catch (error) {
            console.error('[/app] Error checking buyer:', error);
            setLoadingState('error');
            setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
            // Fall back to form page on error
            setTimeout(() => {
              router.replace('/app/form');
            }, 3000);
            return;
          }
        }

        // WebApp not loaded yet, keep polling
        if (attempt < 40) {
          window.setTimeout(() => tryLoadUser(attempt + 1), 50);
        } else {
          // Timeout - WebApp not available
          console.error('[/app] Timeout waiting for WebApp to load');
          setLoadingState('error');
          setErrorMessage('WebApp не загружен. Попробуйте снова.');
        }
      };

      tryLoadUser();
    };

    detectUserAndRedirect();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loadingState === 'phone_required') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Lock className="text-muted-foreground size-12" />
          <p className="text-base font-medium">
            Безопасно подтвердите ваш номер в чате с ботом чтобы оставить заявку
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        {loadingState !== 'error' && (
          <Loader2 className="text-muted-foreground size-12 animate-spin" />
        )}
        <p className="text-muted-foreground text-base">
          {loadingState === 'loading' && 'Загрузка...'}
          {loadingState === 'checking' && 'Проверка аккаунта...'}
          {loadingState === 'redirect' && 'Перенаправление...'}
          {loadingState === 'error' && (
            <span className="text-destructive">Ошибка: {errorMessage || 'Неизвестная ошибка'}</span>
          )}
        </p>
        {loadingState === 'error' && (
          <p className="text-muted-foreground text-sm">Перенаправление через 3 секунды...</p>
        )}
      </div>
    </div>
  );
}
