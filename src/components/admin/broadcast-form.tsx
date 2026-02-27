'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

const MESSAGE_LENGTH_LIMIT = 4000;

type BroadcastResult = {
  sent: number;
  failed: number;
  total: number;
  errors: string[];
};

export function BroadcastForm({ tgCount, maxCount }: { tgCount: number; maxCount: number }) {
  const total = tgCount + maxCount;
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  async function handleSend() {
    if (!window.confirm(`Отправить сообщение ${total} покупателям?`)) return;

    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      const data: BroadcastResult = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ sent: 0, failed: 1, total, errors: [String(err)] });
    } finally {
      setSending(false);
      setConfirmed(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новое оповещение</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>Получатели:</span>
          <Badge variant="outline">Telegram: {tgCount}</Badge>
          <Badge variant="outline">MAX: {maxCount}</Badge>
          <Badge variant="secondary">Всего: {total}</Badge>
        </div>

        <Textarea
          placeholder="Текст сообщения (ссылки и эмодзи поддерживаются)..."
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setConfirmed(false);
            setResult(null);
          }}
          rows={6}
          className="min-h-32 resize-y"
          disabled={sending}
        />

        <div
          className={`text-xs text-right ${
            message.length > MESSAGE_LENGTH_LIMIT
              ? 'text-destructive font-medium'
              : 'text-muted-foreground'
          }`}
        >
          {message.length} / {MESSAGE_LENGTH_LIMIT} симв.
          {message.length > MESSAGE_LENGTH_LIMIT && ' ⚠️ Превышен лимит'}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="confirm-broadcast"
            checked={confirmed}
            onCheckedChange={(v) => setConfirmed(v === true)}
            disabled={
              !message.trim() || sending || total === 0 || message.length > MESSAGE_LENGTH_LIMIT
            }
          />
          <Label htmlFor="confirm-broadcast">
            Я подтверждаю отправку сообщения всем {total} покупателям
          </Label>
        </div>

        <Button
          onClick={handleSend}
          disabled={
            !confirmed || sending || !message.trim() || message.length > MESSAGE_LENGTH_LIMIT
          }
        >
          {sending ? (
            <>
              <Spinner className="mr-2" />
              Отправка...
            </>
          ) : (
            'Отправить'
          )}
        </Button>

        {result && (
          <div
            className={`rounded-md border p-3 text-xs ${result.failed > 0 ? 'border-destructive/50 bg-destructive/10' : 'border-green-500/50 bg-green-500/10'}`}
          >
            <p className="font-medium">
              Отправлено: {result.sent}/{result.total}
              {result.failed > 0 && `, ошибок: ${result.failed}`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
