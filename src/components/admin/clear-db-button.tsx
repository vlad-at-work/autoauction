'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function ClearDbButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleClearDb = async () => {
    const confirmed = window.confirm(
      '⚠️ ВНИМАНИЕ: Это полностью удалит ВСЕ данные из базы (покупатели, заявки, предложения, транзакции, дилеры).\n\nЭто действие необратимо. Вы уверены?'
    );

    if (!confirmed) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/admin/clear-db', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(`Ошибка: ${data.error || 'Не удалось очистить базу'}`);
        return;
      }

      toast.success('✅ База данных очищена!');
      // Reload the page to show updated stats
      window.location.reload();
    } catch (error) {
      console.error('Clear DB error:', error);
      toast.error('Ошибка при очистке базы данных');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleClearDb}
      disabled={isLoading}
      className="gap-2"
    >
      <Trash2 className="size-4" />
      {isLoading ? 'Очистка...' : 'Очистить БД'}
    </Button>
  );
}
