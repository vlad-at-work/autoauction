'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

type LoadingState = 'loading' | 'checking' | 'redirect' | 'error' | 'blocked';

export default function DealerInterfaceHomePage() {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const detectAndRoute = async () => {
      const tryLoadWebApp = async (attempt = 0) => {
        if (cancelled) return;

        console.log('[/dealerinterface] Attempt', attempt, 'to load WebApp');

        const webApp = getWebApp();
        const platform = detectPlatform();
        const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString();
        const initData = webApp?.initData;

        // Get chat ID if available
        const initDataUnsafe = webApp?.initDataUnsafe as Record<string, unknown> | undefined;
        const chatId = (initDataUnsafe?.chat as { id?: number })?.id?.toString() || platformUserId;

        console.log('[/dealerinterface] WebApp detected:', {
          platform,
          platformUserId,
          chatId,
          hasInitData: !!initData,
          attempt,
        });

        if (webApp && platformUserId && platform && initData) {
          setLoadingState('checking');

          try {
            // Check dealer status via API
            const response = await fetch('/api/dealerinterface/check', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${platform}:dealer:${initData}`,
              },
              body: JSON.stringify({
                platformUserId,
                platform: platform.toUpperCase(),
                chatId,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to check dealer status');
            }

            const result = await response.json();

            if (cancelled) return;

            console.log('[/dealerinterface] Check result:', result);

            setLoadingState('redirect');

            if (result.blocked) {
              // Platform user is already a buyer - cannot be dealer
              setLoadingState('blocked');
              setErrorMessage(
                'Этот аккаунт зарегистрирован как покупатель. Дилеры должны использовать отдельный аккаунт.'
              );
              return;
            }

            if (result.status === 'authenticated') {
              // Dealer is authenticated, go to dashboard
              router.replace('/dealerinterface/dashboard');
              return;
            }

            if (result.status === 'needs_password') {
              // Dealer exists but needs to enter password
              router.replace('/dealerinterface/login');
              return;
            }

            if (result.status === 'needs_setup') {
              // New dealer - needs to claim account with username and set password
              router.replace(`/dealerinterface/setup?dealerId=${result.dealerId}`);
              return;
            }

            if (result.status === 'not_dealer') {
              // Platform user is not a registered dealer
              setLoadingState('error');
              setErrorMessage(
                'Вы не зарегистрированы как дилер. Обратитесь к администратору для регистрации.'
              );
              return;
            }

            // Unknown status
            setLoadingState('error');
            setErrorMessage('Неизвестный статус аккаунта');
          } catch (error) {
            console.error('[/dealerinterface] Error checking dealer:', error);
            setLoadingState('error');
            setErrorMessage(error instanceof Error ? error.message : 'Ошибка проверки');
          }
          return;
        }

        // WebApp not loaded yet, keep polling
        if (attempt < 40) {
          window.setTimeout(() => tryLoadWebApp(attempt + 1), 50);
        } else {
          console.error('[/dealerinterface] Timeout waiting for WebApp');
          setLoadingState('error');
          setErrorMessage('WebApp не загружен. Откройте через бота дилера.');
        }
      };

      tryLoadWebApp();
    };

    detectAndRoute();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        {loadingState !== 'error' && loadingState !== 'blocked' && (
          <Loader2 className="text-muted-foreground size-12 animate-spin" />
        )}
        <p className="text-muted-foreground text-base">
          {loadingState === 'loading' && 'Загрузка...'}
          {loadingState === 'checking' && 'Проверка аккаунта дилера...'}
          {loadingState === 'redirect' && 'Перенаправление...'}
          {(loadingState === 'error' || loadingState === 'blocked') && (
            <span className="text-destructive">{errorMessage || 'Неизвестная ошибка'}</span>
          )}
        </p>
      </div>
    </div>
  );
}
