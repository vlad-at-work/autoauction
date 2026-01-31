import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { Buyer } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{ page?: string }>;

export default async function BuyersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const [buyers, total] = await Promise.all([
    prisma.buyer.findMany({
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { inquiries: true } },
      },
    }),
    prisma.buyer.count(),
  ]);

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (b: Buyer & { _count: { inquiries: number } }) => b.id.slice(0, 8) + '...',
    },
    {
      key: 'platform',
      label: 'Платформа',
      render: (b: Buyer & { _count: { inquiries: number } }) => (
        <Badge variant={b.platform === 'MAX' ? 'default' : 'secondary'}>{b.platform}</Badge>
      ),
    },
    { key: 'platformUserId', label: 'ID пользователя в платформе' },
    {
      key: 'platformUserName',
      label: 'Имя',
      render: (b: Buyer & { _count: { inquiries: number } }) => b.platformUserName || '-',
    },
    {
      key: 'inquiries',
      label: 'Заявки',
      render: (b: Buyer & { _count: { inquiries: number } }) => b._count.inquiries,
    },
    {
      key: 'createdAt',
      label: 'Создан',
      render: (b: Buyer & { _count: { inquiries: number } }) =>
        format(b.createdAt, 'dd.MM.yyyy HH:mm'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Покупатели</h1>
      </div>
      <DataTable
        data={buyers}
        columns={columns}
        keyField="id"
        detailPath={(b) => `/admin/buyers/${b.id}`}
        pagination={{ page, limit: LIMIT, total }}
        basePath="/admin/buyers"
      />
    </div>
  );
}
