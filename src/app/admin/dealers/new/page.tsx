import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DealerCreateForm } from '@/components/admin/dealer-create-form';

export default function DealerCreatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dealers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Новый дилер</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Создание</CardTitle>
        </CardHeader>
        <CardContent>
          <DealerCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}
