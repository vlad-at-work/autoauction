'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { AnimatedList } from '@/components/animated-list';
import { InquiryCard } from '@/components/inquiry-card';
import { PageTransition } from '@/components/page-transition';
import { TopBar } from '@/components/ui/top-bar';
import { Button } from '@/components/ui/button';
import { getMyInquiries, type Inquiry, type InquiryLimits } from '@/lib/api/inquiries';
import { pluralize } from '@/lib/utils';
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

  // Fetch inquiries manually (no auto-polling)
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInquiries = useCallback(async () => {
    if (!platformUserId || !platform || !initData) return;

    setLoading(true);
    try {
      const result = await getMyInquiries(initData, platform);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
    } finally {
      setLoading(false);
    }
  }, [initData, platform, platformUserId]);

  useEffect(() => {
    if (ready && platformUserId && platform && initData) {
      fetchInquiries();
    }
  }, [ready, platformUserId, platform, initData, fetchInquiries]);

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

  const hasInquiriesLeft = (limits?.remaining ?? 0) > 0;

  return (
    <PageTransition>
      <div className="min-h-screen w-full">
        <TopBar disableNewInquiry={!hasInquiriesLeft} />
        <div className="mx-auto max-w-2xl px-4 py-6">
          {/* Inquiry limits banner with refresh */}
          {limits && (
            <div className="mb-4 flex items-center justify-between rounded-lg border bg-zinc-50 px-5 py-4">
              <div className="text-base">
                {limits.remaining > 0 ? (
                  <span>
                    <span className="font-medium">
                      {limits.remaining} {pluralize(limits.remaining, 'заявка', 'заявки', 'заявок')}
                    </span>
                    <span className="text-muted-foreground">
                      {' '}
                      {pluralize(limits.remaining, 'осталась', 'осталось', 'осталось')}
                    </span>
                  </span>
                ) : limits.resetsAt && daysUntilReset != null ? (
                  <span className="text-muted-foreground">
                    {daysUntilReset}{' '}
                    {daysUntilReset === 1 ? 'день' : daysUntilReset < 5 ? 'дня' : 'дней'} до новых
                    заявок
                  </span>
                ) : (
                  <span className="text-muted-foreground">Заявки закончились</span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchInquiries}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
          )}

          {/* Inquiries list */}
          {inquiries.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg">Нет заявок. Оставьте первую!</p>
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
