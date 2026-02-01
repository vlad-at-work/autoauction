'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AnimatedList } from '@/components/animated-list';
import { DebugPanel } from '@/components/debug-panel';
import { InquiryCard } from '@/components/inquiry-card';
import { PageTransition } from '@/components/page-transition';
import { Badge } from '@/components/ui/badge';
import { TopBar } from '@/components/ui/top-bar';
import { usePolling } from '@/hooks/use-polling';
import { getMyInquiries, type Inquiry, type InquiryLimits } from '@/lib/api/inquiries';
import { detectPlatform, getWebApp } from '@/app/app/webapp-ready';

type DashboardData = {
  inquiries: Inquiry[];
  limits: InquiryLimits | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [platformChatId, setPlatformChatId] = useState<string | null>(null);
  const [platformUserId, setPlatformUserId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'max' | 'telegram' | null>(null);
  const [ready, setReady] = useState(false);

  // Initialize platform info
  useEffect(() => {
    const webApp = getWebApp();
    const detectedPlatform = detectPlatform();
    const detectedUserId = webApp?.initDataUnsafe?.user?.id?.toString() || null;
    const detectedChatId = webApp?.initDataUnsafe?.chat?.id?.toString() || detectedUserId || null;

    if (!detectedUserId || !detectedPlatform) {
      router.replace('/app');
      return;
    }

    setPlatform(detectedPlatform);
    setPlatformUserId(detectedUserId);
    setPlatformChatId(detectedChatId);
    setReady(true);
  }, [router]);

  // Fetch inquiries with polling
  const fetcher = useCallback(async (): Promise<DashboardData> => {
    if (!platformUserId || !platform) {
      return { inquiries: [], limits: null };
    }
    return getMyInquiries(platformUserId, platform);
  }, [platformUserId, platform]);

  const { data, loading } = usePolling<DashboardData>({
    fetcher,
    interval: 12000,
    enabled: ready && !!platformUserId && !!platform,
  });

  const inquiries = data?.inquiries ?? [];
  const limits = data?.limits ?? null;

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <Loader2 className="text-muted-foreground size-8 animate-spin" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen w-full">
        <TopBar />
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Inquiry limits banner */}
          {limits && (
            <div className="mb-4 flex items-center justify-between rounded-lg border bg-zinc-50 px-4 py-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Заявок осталось: </span>
                <span className="font-medium">
                  {limits.remaining} из {limits.max}
                </span>
              </div>
              {limits.remaining === 0 && limits.resetsAt && (
                <Badge variant="outline" className="text-xs">
                  Новая через{' '}
                  {Math.ceil(
                    (new Date(limits.resetsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                  )}{' '}
                  дн.
                </Badge>
              )}
            </div>
          )}

          {/* Debug panel */}
          {platformChatId && (
            <DebugPanel
              platformChatId={platformChatId}
              platformUserId={platformUserId}
              platform={platform}
            />
          )}

          {/* Inquiries list */}
          {inquiries.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <p className="text-base">Нет заявок</p>
              <p className="mt-2 text-sm">
                Используйте кнопку + в правом верхнем углу, чтобы создать первую заявку
              </p>
            </div>
          ) : (
            <AnimatedList
              items={inquiries}
              keyExtractor={(inquiry) => inquiry.id}
              renderItem={(inquiry) => <InquiryCard inquiry={inquiry} />}
            />
          )}
        </div>
      </div>
    </PageTransition>
  );
}
