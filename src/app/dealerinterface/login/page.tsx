'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to auto-redirect if already authenticated
    const checkAuth = async () => {
      const webApp = getWebApp();
      const platform = detectPlatform();
      const initData = webApp?.initData;

      if (!initData || !platform) return;

      try {
        const response = await fetch('/api/dealer/auth/check', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${platform}:dealer:${initData}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (data.status === 'authenticated') {
          router.push('/dealerinterface/inquiries');
        }
      } catch {
        // Ignore error, stay on login page
      }
    };

    checkAuth();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Введите пароль');
      return;
    }

    setLoading(true);

    try {
      const webApp = getWebApp();
      const initData = webApp?.initData;
      const platform = detectPlatform();

      if (!initData || !platform) {
        setError('Ошибка инициализации');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/dealer/auth/login', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${platform}:dealer:${initData}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/dealerinterface/inquiries');
      } else {
        setError(data.error || 'Ошибка входа');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-md pt-8">
        <div className="rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Вход для дилера</h1>
            <p className="text-sm text-gray-600">Введите пароль для продолжения</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ваш пароль"
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
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function DealerLogin() {
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
      <LoginForm />
    </Suspense>
  );
}
