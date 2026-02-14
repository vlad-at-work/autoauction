'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

type AuthStatus =
  | 'loading'
  | 'not_found'
  | 'needs_setup'
  | 'authenticated'
  | 'error'
  | 'validating'
  | 'success';

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

          // Handle notification deep links (inquiry_ID, accepted_ID)
          if (finalStartParam?.startsWith('inquiry_')) {
            const inquiryId = finalStartParam.substring(8);
            router.push(`/dealerinterface/inquiries/${inquiryId}`);
            return;
          }

          if (finalStartParam?.startsWith('accepted_')) {
            const inquiryId = finalStartParam.substring(9);
            router.push(`/dealerinterface/inquiries/${inquiryId}`);
            return;
          }

          // Validate 6-digit invite code before redirecting
          if (/^\d{6}$/.test(finalStartParam || '')) {
            validateAndRedirect(finalStartParam!);
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

      const validateAndRedirect = async (code: string) => {
        try {
          const response = await fetch('/api/dealer/invite/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code }),
          });

          if (cancelled) return;

          const data = await response.json();

          if (response.ok && data.valid) {
            router.push(`/dealerinterface/setup?token=${code}`);
          } else {
            setError(data.error || 'Неверный код приглашения');
            setStatus('error');
          }
        } catch {
          if (!cancelled) {
            setError('Ошибка проверки кода');
            setStatus('error');
          }
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

  const handleActivate = async () => {
    const code = inviteCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setError('Введите 6-значный код');
      return;
    }

    setStatus('validating');
    setError(null);

    try {
      const response = await fetch('/api/dealer/invite/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setStatus('success');
        // Delay redirect to show success state
        window.setTimeout(() => {
          router.push(`/dealerinterface/setup?token=${code}`);
        }, 800);
      } else {
        setError(data.error || 'Неверный код');
        setStatus('not_found');
      }
    } catch {
      setError('Ошибка проверки кода');
      setStatus('error');
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
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-2xl text-center tracking-widest focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={status === 'validating' || status === 'success' || inviteCode.length !== 6}
            className={`w-full rounded-lg py-3 font-semibold text-white transition disabled:bg-gray-400 ${
              status === 'success'
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {status === 'success' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Готово
              </span>
            ) : status === 'validating' ? (
              'Проверка...'
            ) : (
              'Активировать аккаунт'
            )}
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
