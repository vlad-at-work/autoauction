'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type MiniAppUserState = {
  platformUserId?: string;
  platformUserName?: string;
  isInWebApp: boolean;
};

export default function MiniAppHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<MiniAppUserState>({ isInWebApp: false });

  useEffect(() => {
    let cancelled = false;

    const tryLoadUser = (attempt = 0) => {
      if (cancelled) return;

      const webApp = window.WebApp;
      const platformUserId = webApp?.initDataUnsafe?.user?.id?.toString();
      const platformUserName = webApp?.initDataUnsafe?.user?.name;
      const startParam = webApp?.initDataUnsafe?.start_param;

      if (webApp || attempt === 40) {
        setUser({
          isInWebApp: !!webApp,
          platformUserId,
          platformUserName,
        });

        if (startParam === 'inquiry') {
          router.replace('/app/form');
        }
        return;
      }

      window.setTimeout(() => tryLoadUser(attempt + 1), 50);
    };

    tryLoadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const title = useMemo(() => {
    if (!user.isInWebApp) return 'Откройте эту страницу в Max';
    if (user.platformUserName) return `Привет, ${user.platformUserName}!`;
    return 'AutoAuction';
  }, [user.isInWebApp, user.platformUserName]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-6 px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {user.isInWebApp ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="mb-2 font-semibold">Max WebApp Debug Info:</div>
              <div className="space-y-1 font-mono text-xs">
                <div>
                  <span className="text-muted-foreground">User ID:</span>{' '}
                  <span className="text-foreground">{user.platformUserId ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Username:</span>{' '}
                  <span className="text-foreground">{user.platformUserName ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Platform:</span>{' '}
                  <span className="text-foreground">{window.WebApp?.platform ?? '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Version:</span>{' '}
                  <span className="text-foreground">{window.WebApp?.version ?? '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Эта страница предназначена для мини‑приложения Max. Откройте её через бота.
            </p>
          )}

          <div className="flex gap-3">
            <Button asChild>
              <Link href="/app/form">Заполнить заявку</Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.WebApp?.close?.()}
              disabled={!user.isInWebApp}
            >
              Закрыть
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
