'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type DealerInviteLinksProps = {
  telegramUrl: string | null;
  maxUrl: string | null;
};

export function DealerInviteLinks({ telegramUrl, maxUrl }: DealerInviteLinksProps) {
  const [copied, setCopied] = useState<'telegram' | 'max' | null>(null);

  const copy = async (value: string, kind: 'telegram' | 'max') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Ignore; user can still select/copy manually
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Ссылка нужна, чтобы дилер привязал свой Telegram/MAX аккаунт к этому дилеру при первом
        входе.
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Telegram</div>
        {telegramUrl ? (
          <div className="flex gap-2">
            <Input value={telegramUrl} readOnly />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(telegramUrl, 'telegram')}
            >
              {copied === 'telegram' ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        ) : (
          <div className="text-sm text-destructive">TG_BOT_NAME_DEALER не настроен</div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">MAX</div>
        {maxUrl ? (
          <div className="flex gap-2">
            <Input value={maxUrl} readOnly />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(maxUrl, 'max')}>
              {copied === 'max' ? <Check className="size-4" /> : <Copy className="size-4" />}
            </Button>
          </div>
        ) : (
          <div className="text-sm text-destructive">MAX_BOT_NAME_DEALER не настроен</div>
        )}
      </div>
    </div>
  );
}
