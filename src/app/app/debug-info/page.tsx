'use client';

import { useEffect, useState } from 'react';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';

export default function DebugInfoPage() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    const loadInfo = () => {
      const webApp = getWebApp();
      const platform = detectPlatform();

      if (webApp?.initDataUnsafe) {
        setInfo({
          platform,
          user: webApp.initDataUnsafe.user,
          chat: webApp.initDataUnsafe.chat,
          startParam: webApp.initDataUnsafe.start_param,
          raw: webApp.initDataUnsafe,
        });
      }
    };

    // Poll until loaded
    const interval = setInterval(() => {
      if (getWebApp()) {
        loadInfo();
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  if (!info) {
    return (
      <div className="p-6">
        <p>Loading WebApp data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">WebApp Debug Info</h1>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Platform</h2>
          <p className="font-mono">{info.platform || 'Unknown'}</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">User Info</h2>
          <pre className="overflow-auto text-sm">{JSON.stringify(info.user, null, 2)}</pre>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Chat Info</h2>
          <pre className="overflow-auto text-sm">{JSON.stringify(info.chat, null, 2)}</pre>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Start Param</h2>
          <pre className="overflow-auto text-sm">{info.startParam || '(none)'}</pre>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Full InitDataUnsafe</h2>
          <pre className="overflow-auto text-sm">{JSON.stringify(info.raw, null, 2)}</pre>
        </div>

        <div className="rounded-lg bg-green-100 p-6">
          <h2 className="mb-2 text-lg font-semibold text-green-900">For Notifications:</h2>
          <p className="mb-1 text-sm text-green-800">
            Platform: <span className="font-mono font-bold">{info.platform}</span>
          </p>
          <p className="mb-1 text-sm text-green-800">
            User ID:{' '}
            <span className="font-mono font-bold">{info.user?.id || '(not found)'}</span>
          </p>
          <p className="text-sm text-green-800">
            Chat ID:{' '}
            <span className="font-mono font-bold">
              {info.chat?.id || info.user?.id || '(not found)'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
