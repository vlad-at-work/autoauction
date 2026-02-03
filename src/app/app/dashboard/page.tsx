'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AnimatedList } from '@/components/animated-list';
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
  const [platformUserId, setPlatformUserId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'max' | 'telegram' | null>(null);
  const [initData, setInitData] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [daysUntilReset, setDaysUntilReset] = useState<number | null>(null);

  // Initialize platform info
  useEffect(() => {
    let cancelled = false;

    const webApp = getWebApp();
    const detectedPlatform = detectPlatform();
    const detectedUserId = webApp?.initDataUnsafe?.user?.id?.toString() || null;
    const detectedInitData = webApp?.initData || null;

    if (!detectedUserId || !detectedPlatform || !detectedInitData) {
      router.replace('/app');
      return;
    }

    queueMicrotask(() => {
      if (cancelled) return;
      setPlatform(detectedPlatform);
      setPlatformUserId(detectedUserId);
      setInitData(detectedInitData);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Fetch inquiries with polling
  const fetcher = useCallback(async (): Promise<DashboardData> => {
    if (!platformUserId || !platform || !initData) {
      return { inquiries: [], limits: null };
    }
    return getMyInquiries(initData, platform);
  }, [initData, platform, platformUserId]);

  const { data, loading } = usePolling<DashboardData>({
    fetcher,
    interval: 12000,
    enabled: ready && !!platformUserId && !!platform && !!initData,
  });

  const inquiries = data?.inquiries ?? [];
  const limits = data?.limits ?? null;

  // Avoid using Date.now() during render (react-hooks/purity)
  useEffect(() => {
    let cancelled = false;

    if (!limits?.resetsAt) {
      queueMicrotask(() => {
        if (!cancelled) setDaysUntilReset(null);
      });
      return () => {
        cancelled = true;
      };
    }

    const resetAtMs = new Date(limits.resetsAt).getTime();
    const days = Math.max(0, Math.ceil((resetAtMs - Date.now()) / (24 * 60 * 60 * 1000)));

    queueMicrotask(() => {
      if (!cancelled) setDaysUntilReset(days);
    });

    return () => {
      cancelled = true;
    };
  }, [limits?.resetsAt]);

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
            <div className="mb-4 flex items-center justify-between rounded-lg border bg-zinc-50 px-5 py-4">
              <div className="text-base">
                <span className="text-muted-foreground">Заявок осталось: </span>
                <span className="font-medium">
                  {limits.remaining} из {limits.max}
                </span>
              </div>
              {limits.remaining === 0 && limits.resetsAt && daysUntilReset != null && (
                <Badge variant="outline" className="text-sm">
                  Новая через {daysUntilReset} дн.
                </Badge>
              )}
            </div>
          )}

          {/* Inquiries list */}
          {inquiries.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg">Нет заявок</p>
              <p className="mt-2 text-base">
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
