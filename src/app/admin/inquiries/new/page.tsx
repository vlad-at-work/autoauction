import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InquiryCreateForm } from '@/components/admin/inquiry-create-form';

export default function InquiryCreatePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/inquiries">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Новая заявка</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Создание</CardTitle>
        </CardHeader>
        <CardContent>
          <InquiryCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}
