'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { useWebApp } from '@/hooks/use-webapp';

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { enableClosingConfirmation, disableClosingConfirmation, hapticNotification } = useWebApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Closing confirmation when password field has content
  useEffect(() => {
    if (password.length > 0 && !success) {
      enableClosingConfirmation();
    } else {
      disableClosingConfirmation();
    }
  }, [password, success, enableClosingConfirmation, disableClosingConfirmation]);

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

        // Support both old format (setup_xxx) and new format (6-digit code)
        const finalToken = urlToken || initToken;
        if (finalToken) {
          setToken(finalToken);
        }
        return;
      }

      if (attempt < 40) {
        window.setTimeout(() => tryLoad(attempt + 1), 50);
      }
    };

    tryLoad();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      hapticNotification('error');
      return;
    }

    if (password.length < 8) {
      setError('Минимум 8 символов');
      hapticNotification('error');
      return;
    }

    setLoading(true);

    try {
      const webApp = getWebApp();
      const initData = webApp?.initData;
      const currentPlatform = detectPlatform();

      if (!initData || !currentPlatform) {
        setError('Ошибка инициализации');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/dealer/auth/setup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentPlatform}:dealer:${initData}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password, startParam: token }),
      });

      const data = await response.json();

      if (response.ok) {
        hapticNotification('success');
        disableClosingConfirmation();
        // Show success state before redirect
        setSuccess(true);
        // Delay redirect slightly to show checkmark
        window.setTimeout(() => {
          router.push('/dealerinterface/inquiries');
        }, 800);
      } else {
        setError(data.error || 'Ошибка активации');
        hapticNotification('error');
        setLoading(false);
      }
    } catch {
      setError('Ошибка соединения');
      hapticNotification('error');
      setLoading(false);
    }
    // Note: loading stays true during success state until redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md pt-8">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Установка пароля</h1>
            <p className="text-sm text-gray-600">Создайте пароль для защиты аккаунта</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Минимум 8 символов"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Подтвердите пароль
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Повторите пароль"
                required
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className={`w-full rounded-lg py-3 font-semibold text-white transition disabled:bg-gray-400 ${
                success ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {success ? (
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
              ) : loading ? (
                'Сохранение...'
              ) : (
                'Продолжить'
              )}
            </button>
          </form>
        </div>
      </div>
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
