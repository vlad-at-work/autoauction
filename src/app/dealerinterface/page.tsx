'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

type AuthStatus = 'loading' | 'not_found' | 'needs_setup' | 'authenticated' | 'error';

export default function DealerEntry() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkAuth(initData: string, platform: 'max' | 'telegram') {
      try {
        console.warn('[Dealer Entry] Checking auth...', { platform });

        const response = await fetch('/api/dealer/auth/check', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${platform}:dealer:${initData}`,
            'Content-Type': 'application/json',
          },
        });

        if (cancelled) return;

        const data = await response.json();

        console.warn('[Dealer Entry] Auth status:', data);

        if (data.status === 'not_found') {
          setStatus('not_found');
        } else if (data.status === 'needs_setup') {
          console.warn('[Dealer Entry] Redirecting to setup...');
          router.push('/dealerinterface/setup');
        } else if (data.status === 'authenticated') {
          console.warn('[Dealer Entry] Redirecting to inquiries...');
          router.push('/dealerinterface/inquiries');
        } else if (data.error) {
          setError(data.error);
          setStatus('error');
        } else {
          setError('Unknown response');
          setStatus('error');
        }
      } catch (err) {
        console.error('[Dealer Entry] Error:', err);
        if (!cancelled) {
          setError('Connection error');
          setStatus('error');
        }
      }
    }

    // Poll for WebApp bridge to load (MAX or Telegram)
    const tryLoad = (attempt = 0) => {
      if (cancelled) return;

      const webApp = getWebApp();
      const platform = detectPlatform();
      const initData = webApp?.initData;

      console.warn('[Dealer Entry] Attempt', attempt, { platform, hasInitData: !!initData });

      if (webApp && platform && initData) {
        checkAuth(initData, platform);
        return;
      }

      if (attempt < 40) {
        window.setTimeout(() => tryLoad(attempt + 1), 50);
      } else {
        setError('WebApp not loaded. Please open via MAX or Telegram bot.');
        setStatus('error');
      }
    };

    tryLoad();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl font-semibold text-gray-700">Loading...</div>
          <div className="mt-2 text-sm text-gray-500">Checking authentication</div>
        </div>
      </div>
    );
  }

  if (status === 'error' || error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Error</h1>
            <p className="text-red-600">{error || 'An error occurred'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Not Registered</h1>
            <p className="text-gray-600">
              You are not registered as a dealer. Please contact the administrator to get an invite
              link.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
