'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

type RestoreButtonProps = {
  entityName: string;
  entityId: string;
  onRestore: (id: string) => Promise<{ success: boolean; error?: string }>;
};

export function RestoreButton({ entityName, entityId, onRestore }: RestoreButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRestore = async () => {
    setLoading(true);
    try {
      const res = await onRestore(entityId);
      if (!res.success) {
        toast.error(res.error || `Не удалось восстановить: ${entityName}`);
        return;
      }
      toast.success(`Восстановлено: ${entityName}`);
    } catch {
      toast.error(`Не удалось восстановить: ${entityName}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" disabled={loading} onClick={handleRestore}>
      <RotateCcw className="mr-2 h-4 w-4" />
      {loading ? 'Восстановление…' : 'Восстановить'}
    </Button>
  );
}
