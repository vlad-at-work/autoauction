'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type Props = {
  dealerId: string;
  initialToken: string | null;
  initialExpiresAt: Date | null;
};

export function DealerInviteSection({ dealerId, initialToken, initialExpiresAt }: Props) {
  const [inviteToken, setInviteToken] = useState(initialToken);
  const [inviteExpiresAt, setInviteExpiresAt] = useState(initialExpiresAt);
  const [maxInviteUrl, setMaxInviteUrl] = useState<string | null>(null);
  const [tgInviteUrl, setTgInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedMax, setCopiedMax] = useState(false);
  const [copiedTg, setCopiedTg] = useState(false);

  const MAX_BOT_NAME_DEALER = process.env.NEXT_PUBLIC_MAX_BOT_NAME_DEALER || 'id5010035001_1_bot';

  // Construct URL from existing token (uses ?start= to open chat, not mini-app)
  const currentMaxUrl =
    inviteToken && inviteExpiresAt && new Date(inviteExpiresAt) > new Date()
      ? maxInviteUrl || `https://max.ru/${MAX_BOT_NAME_DEALER}?start=${inviteToken}`
      : null;

  async function handleGenerateInvite() {
    setLoading(true);
    setCopiedMax(false);
    setCopiedTg(false);

    try {
      const response = await fetch(`/api/admin/dealers/${dealerId}/invite`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setInviteToken(data.inviteToken);
        setInviteExpiresAt(new Date(data.inviteTokenExpiresAt));
        setMaxInviteUrl(data.maxInviteUrl);
        setTgInviteUrl(data.tgInviteUrl);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert('Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyMax() {
    if (currentMaxUrl) {
      await navigator.clipboard.writeText(currentMaxUrl);
      setCopiedMax(true);
      setTimeout(() => setCopiedMax(false), 2000);
    }
  }

  async function handleCopyTg() {
    if (tgInviteUrl) {
      await navigator.clipboard.writeText(tgInviteUrl);
      setCopiedTg(true);
      setTimeout(() => setCopiedTg(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ссылки для приглашения</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentMaxUrl ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Статус:</span>
                <Badge variant="default">Активна</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Истекает:</span>
                <span className="text-sm">
                  {inviteExpiresAt ? format(inviteExpiresAt, 'dd.MM.yyyy HH:mm') : '-'}
                </span>
              </div>
            </div>

            {/* MAX Link */}
            <div className="space-y-2">
              <label className="text-sm font-medium">MAX ссылка:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentMaxUrl}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
                <Button onClick={handleCopyMax} variant="outline" size="sm">
                  {copiedMax ? '✓ Скопировано' : 'Копировать'}
                </Button>
              </div>
            </div>

            {/* Telegram Link */}
            {tgInviteUrl && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Telegram ссылка:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={tgInviteUrl}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                  />
                  <Button onClick={handleCopyTg} variant="outline" size="sm">
                    {copiedTg ? '✓ Скопировано' : 'Копировать'}
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={handleGenerateInvite} disabled={loading} variant="secondary" size="sm">
              Сгенерировать новые
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Нет активной ссылки. Сгенерируйте ссылку, чтобы дилер мог активировать аккаунт через
              MAX или Telegram.
            </p>
            <Button onClick={handleGenerateInvite} disabled={loading}>
              {loading ? 'Генерация...' : 'Сгенерировать ссылки'}
            </Button>
          </>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-900">
            <strong>Как это работает:</strong> Отправьте любую ссылку дилеру. При открытии будет
            создан чат с ботом, и он получит кнопку для активации аккаунта в мини-приложении.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
