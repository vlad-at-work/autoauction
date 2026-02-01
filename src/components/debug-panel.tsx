'use client';

import { Clock, Copy, ExternalLink, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DebugPanelProps = {
  platformChatId: string;
  platformUserId: string | null;
  platform: 'max' | 'telegram' | null;
  onClearDb?: () => void;
};

export function DebugPanel({ platformChatId, platformUserId, platform, onClearDb }: DebugPanelProps) {
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [localTime, setLocalTime] = useState<string | null>(null);
  const [clearingDb, setClearingDb] = useState(false);
  const [migratingCascades, setMigratingCascades] = useState(false);

  const copyChatId = async () => {
    try {
      await navigator.clipboard.writeText(platformChatId);
    } catch {
      // best-effort
    }
  };

  const sendTestMessage = async () => {
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

  const migrateCascades = async () => {
    if (!confirm('Запустить миграцию каскадного удаления?')) return;

    setMigratingCascades(true);
    try {
      const response = await fetch('/api/debug/migrate-cascades', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        alert(`Миграция не выполнена: ${data.error || 'Неизвестная ошибка'}`);
        return;
      }
      alert('Миграция выполнена');
    } catch (err) {
      alert(`Миграция не выполнена: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setMigratingCascades(false);
    }
  };

  const clearDatabase = async () => {
    if (!confirm('Удалить ВСЕ данные? Это действие необратимо!')) return;

    setClearingDb(true);
    try {
      const response = await fetch('/api/debug/clear-db', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        alert(`Ошибка очистки: ${data.error || 'Неизвестная ошибка'}`);
        return;
      }
      alert('База данных очищена');
      onClearDb?.();
      window.location.reload();
    } catch (err) {
      alert(`Ошибка очистки: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setClearingDb(false);
    }
  };

  return (
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
          {platform === 'max' && (
            <Button type="button" variant="default" size="sm" onClick={sendTestMessage}>
              <Send className="mr-1 size-4" />
              Отправить «hello world»
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={() => setLocalTime(new Date().toLocaleString())}>
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
          Платформа: <span className="font-mono">{platform ?? '(неизвестно)'}</span> · ID пользователя:{' '}
          <span className="font-mono">{platformUserId ?? '(неизвестно)'}</span>
        </div>
        {localTime && (
          <div className="text-xs">
            Локальное время: <span className="font-mono">{localTime}</span>
          </div>
        )}
        {sendState === 'success' && (
          <div className="text-xs text-green-700">Отправлено (проверьте чат с ботом MAX)</div>
        )}
        {sendState === 'error' && (
          <div className="text-xs text-red-700">Ошибка отправки: {sendError}</div>
        )}
        {sendState === 'sending' && <div className="text-xs text-zinc-600">Отправка...</div>}
      </CardContent>
    </Card>
  );
}
