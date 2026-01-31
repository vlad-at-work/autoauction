'use client';

import { Clock, Copy, ExternalLink, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { InquiryCard } from '@/components/inquiry-card';
import { PageTransition } from '@/components/page-transition';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TopBar } from '@/components/ui/top-bar';
import { getMyInquiries, type Inquiry } from '@/lib/api/inquiries';
import { detectPlatform, getWebApp } from '@/app/app/webapp-ready';

export default function DashboardPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformChatId, setPlatformChatId] = useState<string | null>(null);
  const [platformUserId, setPlatformUserId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'max' | 'telegram' | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [localTime, setLocalTime] = useState<string | null>(null);
  const [clearingDb, setClearingDb] = useState(false);
  const [migratingCascades, setMigratingCascades] = useState(false);

  const migrateCascades = async () => {
    if (!confirm('Запустить миграцию каскадного удаления?')) return;

    setMigratingCascades(true);
    try {
      const response = await fetch('/api/debug/migrate-cascades', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        alert(`❌ Миграция не выполнена: ${data.error || 'Неизвестная ошибка'}`);
        return;
      }
      alert('✅ Миграция выполнена');
    } catch (err) {
      alert(
        `❌ Миграция не выполнена: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`
      );
    } finally {
      setMigratingCascades(false);
    }
  };

  const clearDatabase = async () => {
    if (!confirm('⚠️ Удалить ВСЕ данные? Это действие необратимо!')) return;

    setClearingDb(true);
    try {
      const response = await fetch('/api/debug/clear-db', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        alert(`❌ Ошибка очистки: ${data.error || 'Неизвестная ошибка'}`);
        return;
      }
      setInquiries([]);
      alert('✅ База данных очищена');
      // Reload the page to ensure fresh data
      window.location.reload();
    } catch (err) {
      alert(`❌ Ошибка очистки: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setClearingDb(false);
    }
  };

  const loadInquiries = async () => {
    // Get user ID from WebApp
    const webApp = getWebApp();
    const detectedPlatform = detectPlatform();
    const detectedUserId = webApp?.initDataUnsafe?.user?.id?.toString() || null;
    const detectedChatId = webApp?.initDataUnsafe?.chat?.id?.toString() || detectedUserId || null;

    setPlatform(detectedPlatform);
    setPlatformUserId(detectedUserId);
    setPlatformChatId(detectedChatId);

    if (!detectedUserId || !detectedPlatform) {
      // If no user detected, redirect to entry point
      router.replace('/app');
      return;
    }

    const data = await getMyInquiries(detectedUserId, detectedPlatform);
    setInquiries(data);
    setLoading(false);
  };

  useEffect(() => {
    loadInquiries();

    // Auto-refresh on window focus
    const handleFocus = () => {
      loadInquiries();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [router]);

  const copyChatId = async () => {
    if (!platformChatId) return;
    try {
      await navigator.clipboard.writeText(platformChatId);
    } catch {
      // best-effort
    }
  };

  const sendTestMessage = async () => {
    if (!platformChatId) return;

    setSendState('sending');
    setSendError(null);

    try {
      const res = await fetch('/api/debug/max/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: platformChatId, text: 'hello world' }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean };

      if (!res.ok || !data.success) {
        setSendState('error');
        setSendError(data.error || `HTTP ${res.status}`);
        return;
      }

      setSendState('success');
    } catch (err) {
      setSendState('error');
      setSendError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    }
  };

  const showLocalTime = () => {
    setLocalTime(new Date().toLocaleString());
  };

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
          {platformChatId ? (
            <Card className="mb-4">
              <CardHeader className="flex items-center justify-between gap-3">
                <CardTitle>Отладка: ID чата</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/app/debug-info">
                    <ExternalLink className="mr-1 size-4" />
                    Отладка
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-muted text-foreground rounded-md px-2 py-1 font-mono text-sm">
                    {platformChatId}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={copyChatId}>
                    <Copy className="mr-1 size-4" />
                    Копировать
                  </Button>
                  {platform === 'max' ? (
                    <Button type="button" variant="default" size="sm" onClick={sendTestMessage}>
                      <Send className="mr-1 size-4" />
                      Отправить «hello world»
                    </Button>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" onClick={showLocalTime}>
                    <Clock className="mr-1 size-4" />
                    Показать время
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={migrateCascades}
                    disabled={migratingCascades}
                  >
                    {migratingCascades ? 'Миграция...' : 'Миграция'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={clearDatabase}
                    disabled={clearingDb}
                  >
                    {clearingDb ? 'Очистка...' : 'Очистить БД'}
                  </Button>
                </div>
                <div className="text-muted-foreground text-xs">
                  Платформа: <span className="font-mono">{platform ?? '(неизвестно)'}</span> · ID
                  пользователя:{' '}
                  <span className="font-mono">{platformUserId ?? '(неизвестно)'}</span>
                </div>
                {localTime ? (
                  <div className="text-xs">
                    Локальное время: <span className="font-mono">{localTime}</span>
                  </div>
                ) : null}
                {sendState === 'success' ? (
                  <div className="text-xs text-green-700">
                    Отправлено ✅ (проверьте чат с ботом MAX)
                  </div>
                ) : null}
                {sendState === 'error' ? (
                  <div className="text-xs text-red-700">Ошибка отправки: {sendError}</div>
                ) : null}
                {sendState === 'sending' ? (
                  <div className="text-xs text-zinc-600">Отправка…</div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
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
