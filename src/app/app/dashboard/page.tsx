'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { InquiryCard } from '@/components/inquiry-card';
import { PageTransition } from '@/components/page-transition';
import { TopBar } from '@/components/ui/top-bar';
import { useDebugMode } from '@/contexts/DebugModeContext';
import { getMyInquiries } from '@/lib/api/inquiries';
import type { MockInquiry } from '@/lib/debug/mock-data';

export default function DashboardPage() {
  const router = useRouter();
  const { debugMode } = useDebugMode();
  const [inquiries, setInquiries] = useState<MockInquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadInquiries = async () => {
      // Get user ID from debug mode or WebApp
      let platformUserId: string | null = null;

      if (debugMode.enabled && debugMode.mockUserId) {
        platformUserId = debugMode.mockUserId;
      } else {
        // Wait for WebApp to load
        const webApp = window.WebApp;
        platformUserId = webApp?.initDataUnsafe?.user?.id?.toString() || null;

        if (!platformUserId) {
          // If no user detected, redirect to entry point
          router.replace('/app');
          return;
        }
      }

      const data = await getMyInquiries(platformUserId, 'max', debugMode);

      if (cancelled) return;

      setInquiries(data);
      setLoading(false);
    };

    loadInquiries();

    return () => {
      cancelled = true;
    };
  }, [debugMode, router]);

  if (loading) {
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
          {inquiries.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center">
              <p className="text-base">Нет заявок</p>
              <p className="mt-2 text-sm">
                Используйте кнопку + в правом верхнем углу, чтобы создать первую заявку
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {inquiries.map((inquiry) => (
                <InquiryCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
