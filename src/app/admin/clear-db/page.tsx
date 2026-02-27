import { AlertTriangle } from 'lucide-react';
import { ClearDbButton } from '@/components/admin/clear-db-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default function ClearDbPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Очистка базы данных</h1>

      <div className="flex gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Только для отладки</p>
          <p className="text-sm">
            Эта функция предназначена исключительно для отладочных целей. Все удалённые данные
            невозможно восстановить.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Очистить всю базу данных</CardTitle>
          <CardDescription>
            Это действие полностью удалит все данные: покупателей, заявки, предложения, транзакции и
            дилеров.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClearDbButton />
        </CardContent>
      </Card>
    </div>
  );
}
