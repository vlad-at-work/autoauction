'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type Props = {
  dealerId: string;
  passwordSet: boolean;
};

export function DealerPasswordResetSection({ dealerId, passwordSet }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState(passwordSet);

  async function handleResetPassword() {
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/dealers/${dealerId}/reset-password`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordStatus(false);
        setShowConfirm(false);
      } else {
        alert(`Error: ${data.error || 'Failed to reset password'}`);
      }
    } catch {
      alert('Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (!passwordStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Пароль</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Статус:</span>
            <Badge variant="secondary">Не установлен</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Дилер должен установить пароль через ссылку приглашения ниже.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Пароль</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Статус:</span>
          <Badge variant="default">Установлен</Badge>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-xs text-yellow-900">
            <strong>Забыл пароль:</strong> Нажмите кнопку ниже, чтобы сбросить пароль. Дилер сможет
            установить новый пароль через ссылку приглашения.
          </p>
        </div>

        <Button
          onClick={() => setShowConfirm(true)}
          variant="destructive"
          size="sm"
          disabled={loading}
        >
          {loading ? 'Сброс...' : 'Сбросить пароль'}
        </Button>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogTitle>Сбросить пароль дилера?</AlertDialogTitle>
            <AlertDialogDescription>
              Пароль будет очищен. Дилер сможет установить новый пароль через ссылку приглашения
              (нажмите «Сгенерировать ссылки» ниже).
            </AlertDialogDescription>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetPassword}
                className="bg-destructive hover:bg-destructive/90"
              >
                Сбросить
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
