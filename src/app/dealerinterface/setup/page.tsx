'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { useWebApp } from '@/hooks/use-webapp';

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hapticNotification } = useWebApp();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');

    const tryLoad = (attempt = 0) => {
      const webApp = getWebApp();
      const detectedPlatform = detectPlatform();

      if (webApp && detectedPlatform) {
        const initDataUnsafe = webApp.initDataUnsafe as Record<string, unknown> | undefined;
        const initToken =
          (initDataUnsafe?.start_param as string | undefined) ||
          (initDataUnsafe?.tgWebAppStartParam as string | undefined);

        const finalToken = urlToken || initToken;

        if (!finalToken) {
          setError('Код приглашения не найден. Откройте ссылку-приглашение заново.');
          setStatus('error');
          return;
        }

        claimAccount(finalToken, webApp.initData ?? '', detectedPlatform);
        return;
      }

      if (attempt < 40) {
        window.setTimeout(() => tryLoad(attempt + 1), 50);
      } else {
        setError('Откройте через бота MAX или Telegram');
        setStatus('error');
      }
    };

    async function claimAccount(token: string, initData: string, platform: string) {
      try {
        const response = await fetch('/api/dealer/auth/setup', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${platform}:dealer:${initData}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ startParam: token }),
        });

        const data = await response.json();

        if (response.ok) {
          hapticNotification('success');
          setStatus('success');
          window.setTimeout(() => {
            router.push('/dealerinterface/inquiries');
          }, 800);
        } else {
          setError(data.error || 'Ошибка активации');
          hapticNotification('error');
          setStatus('error');
        }
      } catch {
        setError('Ошибка соединения');
        hapticNotification('error');
        setStatus('error');
      }
    }

    tryLoad();
  }, [searchParams, router, hapticNotification]);

  if (status === 'success') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-gray-900">Аккаунт активирован</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="mb-2 text-xl font-bold text-gray-900">Ошибка активации</h1>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4">
      <Loader2 className="text-muted-foreground size-12 animate-spin" />
    </div>
  );
}

export default function DealerSetup() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center px-4">
          <Loader2 className="text-muted-foreground size-12 animate-spin" />
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}
