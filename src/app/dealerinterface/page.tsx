'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

console.warn('[=== FRONTEND ENTRY MODULE LOADED ===]');

type AuthStatus = 'loading' | 'not_found' | 'needs_setup' | 'authenticated' | 'error';

function DealerEntryContent() {
  console.warn('[=== ENTRY COMPONENT MOUNTED ===]');

  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    console.warn('[=== ENTRY useEffect START ===]');
    console.warn('[ENTRY] Current URL:', window.location.href);
    console.warn('[ENTRY] Search params:', window.location.search);

    let cancelled = false;

    async function init() {
      const urlStartParam = searchParams.get('startapp');
      console.warn('[ENTRY] URL startapp param:', urlStartParam);

      const tryLoad = (attempt = 0) => {
        if (cancelled) {
          console.warn('[ENTRY] Cancelled at attempt', attempt);
          return;
        }

        console.warn('[ENTRY] Attempt', attempt);

        const webApp = getWebApp();
        const platform = detectPlatform();
        const initData = webApp?.initData;

        console.warn('[ENTRY] webApp exists:', !!webApp);
        console.warn('[ENTRY] platform:', platform);
        console.warn('[ENTRY] has initData:', !!initData);

        if (webApp) {
          console.warn('[ENTRY] webApp keys:', Object.keys(webApp));
          console.warn(
            '[ENTRY] webApp.initDataUnsafe:',
            JSON.stringify(webApp.initDataUnsafe)?.substring(0, 500)
          );
        }

        if (webApp && platform) {
          const initDataUnsafe = webApp.initDataUnsafe as Record<string, unknown> | undefined;
          const initStartParam =
            (initDataUnsafe?.start_param as string | undefined) ||
            (initDataUnsafe?.tgWebAppStartParam as string | undefined);

          console.warn('[ENTRY] initStartParam:', initStartParam);

          const finalStartParam = urlStartParam || initStartParam;
          console.warn('[ENTRY] finalStartParam:', finalStartParam);

          if (finalStartParam?.startsWith('setup_')) {
            console.warn(
              '[ENTRY] → Auto-detected invite, navigating to setup with token:',
              finalStartParam
            );
            router.push(`/dealerinterface/setup?token=${finalStartParam}`);
            return;
          }

          if (initData) {
            console.warn('[ENTRY] → No invite token, checking auth...');
            checkAuth(initData, platform);
          } else {
            console.warn('[ENTRY] → No initData, continuing to poll...');
          }
          return;
        }

        if (attempt < 40) {
          console.warn('[ENTRY] Polling... attempt', attempt, 'of 40');
          window.setTimeout(() => tryLoad(attempt + 1), 50);
        } else {
          console.warn('[ENTRY] ERROR: Max attempts reached, WebApp not loaded');
          setError('WebApp not loaded. Please open via MAX or Telegram bot.');
          setStatus('error');
        }
      };

      const checkAuth = async (initData: string, platform: 'max' | 'telegram') => {
        console.warn('[ENTRY] checkAuth called with platform:', platform);
        console.warn('[ENTRY] initData length:', initData.length);

        try {
          const authHeader = `Bearer ${platform}:dealer:${initData}`;
          console.warn('[ENTRY] Making /api/dealer/auth/check request...');
          console.warn('[ENTRY] Auth header:', authHeader.substring(0, 100) + '...');

          const response = await fetch('/api/dealer/auth/check', {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
            },
          });

          console.warn('[ENTRY] Response status:', response.status);

          if (cancelled) {
            console.warn('[ENTRY] Request cancelled after fetch');
            return;
          }

          const data = await response.json();
          console.warn('[ENTRY] Response data:', JSON.stringify(data));

          if (data.status === 'not_found') {
            console.warn('[ENTRY] → Status: not_found, showing invite form');
            setStatus('not_found');
          } else if (data.status === 'needs_setup') {
            console.warn('[ENTRY] → Status: needs_setup, navigating to setup');
            router.push('/dealerinterface/setup');
          } else if (data.status === 'authenticated') {
            console.warn('[ENTRY] → Status: authenticated, navigating to inquiries');
            router.push('/dealerinterface/inquiries');
          } else if (data.error) {
            console.warn('[ENTRY] → Error from API:', data.error);
            setError(data.error);
            setStatus('error');
          }
        } catch (err) {
          console.error('[ENTRY] checkAuth ERROR:', err);
          if (!cancelled) {
            setError('Connection error');
            setStatus('error');
          }
        }
      };

      tryLoad();
    }

    init();

    return () => {
      console.warn('[=== ENTRY CLEANUP ===]');
      cancelled = true;
    };
  }, [router, searchParams]);

  const handleActivate = () => {
    console.warn('[ENTRY] handleActivate clicked');
    const code = inviteCode.trim();
    console.warn('[ENTRY] Invite code entered:', code);

    if (code.startsWith('setup_')) {
      console.warn('[ENTRY] → Navigating to setup with code');
      router.push(`/dealerinterface/setup?token=${code}`);
    } else if (code) {
      console.warn('[ENTRY] → Invalid code format');
      setError('Please paste the full invite code starting with &quot;setup_&quot;');
    }
  };

  console.warn('[ENTRY] Rendering with status:', status);

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
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <div className="mb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="mb-2 text-xl font-bold text-gray-900">Error</h1>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // NOT FOUND - Show invite activation screen
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Activate Dealer Account</h1>
          <p className="text-gray-600">Enter your invite code to get started</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              You should have received an invite code from the admin. Paste it below (starts with
              &quot;setup_&quot;):
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="setup_xxx_xxx"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            Activate Account
          </button>

          <div className="text-xs text-gray-500 text-center">
            Don&apos;t have a code? Contact your administrator.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DealerEntry() {
  console.warn('[=== EXPORT DEFAULT RENDER ===]');
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
      <DealerEntryContent />
    </Suspense>
  );
}
