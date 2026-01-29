import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { Inquiry, Buyer } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{ page?: string; status?: string }>;

type InquiryWithRelations = Inquiry & {
  buyer: Buyer;
  _count: { offers: number };
};

export default async function InquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const statusFilter = params.status;

  const now = new Date();
  const where =
    statusFilter === 'active'
      ? { expiresAt: { gte: now } }
      : statusFilter === 'expired'
        ? { expiresAt: { lt: now } }
        : {};

  const [inquiries, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: true,
        _count: { select: { offers: true } },
      },
    }),
    prisma.inquiry.count({ where }),
  ]);

  const columns = [
    { key: 'id', label: 'ID', render: (i: InquiryWithRelations) => i.id.slice(0, 8) + '...' },
    {
      key: 'buyer',
      label: 'Покупатель',
      render: (i: InquiryWithRelations) => i.buyer.platformUserName || i.buyer.platformUserId,
    },
    {
      key: 'model',
      label: 'Модель',
      render: (i: InquiryWithRelations) => `${i.model} ${i.submodel}`,
    },
    { key: 'phone', label: 'Телефон' },
    { key: 'offers', label: 'Предложения', render: (i: InquiryWithRelations) => i._count.offers },
    {
      key: 'status',
      label: 'Статус',
      render: (i: InquiryWithRelations) => {
        const isExpired = new Date(i.expiresAt) < now;
        return (
          <Badge variant={isExpired ? 'secondary' : 'default'}>
            {isExpired ? 'Истекла' : 'Активна'}
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Создана',
      render: (i: InquiryWithRelations) => format(i.createdAt, 'dd.MM.yyyy HH:mm'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Заявки</h1>
        <div className="flex gap-2">
          <Badge variant={!statusFilter ? 'default' : 'outline'} className="cursor-pointer" asChild>
            <Link href="/admin/inquiries">Все</Link>
          </Badge>
          <Badge
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            className="cursor-pointer"
            asChild
          >
            <Link href="/admin/inquiries?status=active">Активные</Link>
          </Badge>
          <Badge
            variant={statusFilter === 'expired' ? 'default' : 'outline'}
            className="cursor-pointer"
            asChild
          >
            <Link href="/admin/inquiries?status=expired">Истекшие</Link>
          </Badge>
        </div>
      </div>
      <DataTable
        data={inquiries}
        columns={columns}
        keyField="id"
        detailPath={(i) => `/admin/inquiries/${i.id}`}
        pagination={{ page, limit: LIMIT, total }}
        basePath={`/admin/inquiries${statusFilter ? `?status=${statusFilter}` : ''}`}
      />
    </div>
  );
}
