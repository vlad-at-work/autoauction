'use client';

import { useEffect, useState } from 'react';
import { Clock, Copy, Send } from 'lucide-react';
import { getWebApp, detectPlatform } from '@/app/app/webapp-ready';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type WebAppUser = { id?: string | number } | null;
type WebAppChat = { id?: string | number } | null;

type WebAppDebugInfo = {
  platform: 'max' | 'telegram' | null;
  user: WebAppUser;
  chat: WebAppChat;
  startParam: string | null;
  raw: unknown;
};

export default function DebugInfoPage() {
  const [info, setInfo] = useState<WebAppDebugInfo | null>(null);
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [localTime, setLocalTime] = useState<string | null>(null);

  useEffect(() => {
    const loadInfo = () => {
      const webApp = getWebApp();
      const platform = detectPlatform();

      if (webApp?.initDataUnsafe) {
        setInfo({
          platform,
          user: (webApp.initDataUnsafe.user as WebAppUser) ?? null,
          chat: (webApp.initDataUnsafe.chat as WebAppChat) ?? null,
          startParam: (webApp.initDataUnsafe.start_param as string | undefined) ?? null,
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
        <p>Загрузка данных WebApp...</p>
      </div>
    );
  }

  const chatId = (info.chat?.id || info.user?.id || '')?.toString();

  const copyChatId = async () => {
    if (!chatId) return;
    try {
      await navigator.clipboard.writeText(chatId);
    } catch {
      // best-effort
    }
  };

  const sendTestMessage = async () => {
    if (!chatId || info.platform !== 'max') return;

    setSendState('sending');
    setSendError(null);

    try {
      const res = await fetch('/api/debug/max/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, text: 'hello world' }),
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

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Отладка WebApp</h1>

        <Card>
          <CardHeader>
            <CardTitle>ID чата (для уведомлений в MAX)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-muted text-foreground rounded-md px-2 py-1 font-mono text-base">
                {chatId || '(не найден)'}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyChatId}
                disabled={!chatId}
              >
                <Copy className="mr-1 size-4" />
                Копировать
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={sendTestMessage}
                disabled={!chatId || info.platform !== 'max'}
              >
                <Send className="mr-1 size-4" />
                Отправить «hello world»
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={showLocalTime}>
                <Clock className="mr-1 size-4" />
                Показать время
              </Button>
            </div>
            <div className="text-muted-foreground text-xs">
              Платформа: <span className="font-mono">{info.platform || 'Неизвестно'}</span> · ID
              пользователя: <span className="font-mono">{info.user?.id || '(не найден)'}</span>
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

        <Card>
          <CardHeader>
            <CardTitle>Платформа</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono">{info.platform || 'Неизвестно'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Данные пользователя</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto text-sm">{JSON.stringify(info.user, null, 2)}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Данные чата</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto text-sm">{JSON.stringify(info.chat, null, 2)}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Параметр start</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto text-sm">{info.startParam || '(нет)'}</pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Полный InitDataUnsafe</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto text-sm">{JSON.stringify(info.raw, null, 2)}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
