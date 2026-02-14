'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'max' | 'telegram' | null>(null);

  useEffect(() => {
    // Get token from URL or initData
    const urlToken = searchParams.get('token');

    const tryLoad = (attempt = 0) => {
      const webApp = getWebApp();
      const detectedPlatform = detectPlatform();

      if (webApp && detectedPlatform) {
        setPlatform(detectedPlatform);

        // Get start_param from initData as fallback
        const initDataUnsafe = webApp.initDataUnsafe as Record<string, unknown> | undefined;
        const initToken =
          (initDataUnsafe?.start_param as string | undefined) ||
          (initDataUnsafe?.tgWebAppStartParam as string | undefined);

        const finalToken = urlToken || initToken;

        console.warn('[Dealer Setup] Token:', finalToken);
        setToken(finalToken || null);
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
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const webApp = getWebApp();
      const initData = webApp?.initData;
      const currentPlatform = platform || detectPlatform();

      if (!initData || !currentPlatform) {
        setError('Invalid initialization data');
        setLoading(false);
        return;
      }

      console.warn('[Dealer Setup] Submitting setup...', {
        hasToken: !!token,
        platform: currentPlatform,
      });

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
        console.warn('[Dealer Setup] Success, redirecting to inquiries');
        router.push('/dealerinterface/inquiries');
      } else {
        console.error('[Dealer Setup] Failed:', data);
        setError(data.error || 'Setup failed');
      }
    } catch (err) {
      console.error('[Dealer Setup] Error:', err);
      setError('Connection error');
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
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Set Your Password</h1>
            <p className="text-sm text-gray-600">
              {token
                ? 'Create a password to activate your dealer account'
                : 'Create a password to secure your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Re-enter password"
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
              {loading ? 'Setting up...' : 'Continue'}
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-700">Loading...</div>
          </div>
        </div>
      }
    >
      <SetupForm />
    </Suspense>
  );
}
