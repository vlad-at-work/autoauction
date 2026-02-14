'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

type AuthStatus = 'loading' | 'not_found' | 'needs_setup' | 'authenticated' | 'error';

function DealerEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const urlStartParam = searchParams.get('startapp');

      const tryLoad = (attempt = 0) => {
        if (cancelled) return;

        const webApp = getWebApp();
        const platform = detectPlatform();
        const initData = webApp?.initData;

        if (webApp && platform) {
          const initDataUnsafe = webApp.initDataUnsafe as Record<string, unknown> | undefined;
          const initStartParam =
            (initDataUnsafe?.start_param as string | undefined) ||
            (initDataUnsafe?.tgWebAppStartParam as string | undefined);

          const finalStartParam = urlStartParam || initStartParam;

          // Support both old format (setup_xxx) and new format (6-digit code)
          if (finalStartParam?.startsWith('setup_') || /^\d{6}$/.test(finalStartParam || '')) {
            router.push(`/dealerinterface/setup?token=${finalStartParam}`);
            return;
          }

          if (initData) {
            checkAuth(initData, platform);
          }
          return;
        }

        if (attempt < 40) {
          window.setTimeout(() => tryLoad(attempt + 1), 50);
        } else {
          setError('Откройте через бота MAX или Telegram');
          setStatus('error');
        }
      };

      const checkAuth = async (initData: string, platform: 'max' | 'telegram') => {
        try {
          const response = await fetch('/api/dealer/auth/check', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${platform}:dealer:${initData}`,
              'Content-Type': 'application/json',
            },
          });

          if (cancelled) return;

          const data = await response.json();

          if (data.status === 'not_found') {
            setStatus('not_found');
          } else if (data.status === 'needs_setup') {
            router.push('/dealerinterface/setup');
          } else if (data.status === 'authenticated') {
            router.push('/dealerinterface/inquiries');
          } else if (data.error) {
            setError(data.error);
            setStatus('error');
          }
        } catch {
          if (!cancelled) {
            setError('Ошибка соединения');
            setStatus('error');
          }
        }
      };

      tryLoad();
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleActivate = () => {
    const code = inviteCode.trim();
    // Support both old format (setup_xxx) and new format (6-digit code)
    if (code.startsWith('setup_') || /^\d{6}$/.test(code)) {
      router.push(`/dealerinterface/setup?token=${code}`);
    } else if (code) {
      setError('Введите 6-значный код или полный код, начинающийся с &quot;setup_&quot;');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700">Загрузка...</div>
          <div className="mt-2 text-sm text-gray-500">Проверка авторизации</div>
        </div>
      </div>
    );
  }

  if (status === 'error' || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Ошибка</h1>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Активация аккаунта дилера</h1>
          <p className="text-gray-600">Введите код приглашения</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              Введите 6-значный код, полученный от администратора:
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Код приглашения</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="123456"
              maxLength={20}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm text-center tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={!inviteCode.trim()}
            className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            Активировать аккаунт
          </button>

          <div className="text-xs text-gray-500 text-center">
            Нет кода? Свяжитесь с администратором.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DealerEntry() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-700">Загрузка...</div>
          </div>
        </div>
      }
    >
      <DealerEntryContent />
    </Suspense>
  );
}
