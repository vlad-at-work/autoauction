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
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const MAX_BOT_NAME_DEALER =
    process.env.NEXT_PUBLIC_MAX_BOT_NAME_DEALER || 'id5010035001_1_bot';

  // Construct URL from existing token
  const currentInviteUrl =
    inviteToken && inviteExpiresAt && new Date(inviteExpiresAt) > new Date()
      ? inviteUrl || `https://max.ru/${MAX_BOT_NAME_DEALER}?start=setup_${dealerId}_${inviteToken}`
      : null;

  async function handleGenerateInvite() {
    setLoading(true);
    setCopied(false);

    try {
      const response = await fetch(`/api/admin/dealers/${dealerId}/invite`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setInviteToken(data.inviteToken);
        setInviteExpiresAt(new Date(data.inviteTokenExpiresAt));
        setInviteUrl(data.inviteUrl);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert('Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (currentInviteUrl) {
      await navigator.clipboard.writeText(currentInviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Link (MAX)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentInviteUrl ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Expires:</span>
                <span className="text-sm">
                  {inviteExpiresAt ? format(inviteExpiresAt, 'dd.MM.yyyy HH:mm') : '-'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Invite URL:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentInviteUrl}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                />
                <Button onClick={handleCopyLink} variant="outline" size="sm">
                  {copied ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
            </div>

            <Button onClick={handleGenerateInvite} disabled={loading} variant="secondary" size="sm">
              Regenerate Link
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              No active invite link. Generate one to allow this dealer to claim their account via
              MAX.
            </p>
            <Button onClick={handleGenerateInvite} disabled={loading}>
              {loading ? 'Generating...' : 'Generate Invite Link'}
            </Button>
          </>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-900">
            <strong>How it works:</strong> Send this link to the dealer. When they open it on MAX,
            they&apos;ll be prompted to set a password and activate their account.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
