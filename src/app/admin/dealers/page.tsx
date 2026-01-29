import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { Dealer } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{ page?: string }>;

type DealerWithCount = Dealer & { _count: { offers: number } };

export default async function DealersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));

  const [dealers, total] = await Promise.all([
    prisma.dealer.findMany({
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { offers: true } },
      },
    }),
    prisma.dealer.count(),
  ]);

  const columns = [
    { key: 'id', label: 'ID', render: (d: DealerWithCount) => d.id.slice(0, 8) + '...' },
    { key: 'username', label: 'Имя пользователя' },
    { key: 'name', label: 'Имя', render: (d: DealerWithCount) => d.name || '-' },
    {
      key: 'active',
      label: 'Статус',
      render: (d: DealerWithCount) => (
        <Badge variant={d.active ? 'default' : 'secondary'}>
          {d.active ? 'Активен' : 'Неактивен'}
        </Badge>
      ),
    },
    { key: 'offers', label: 'Предложения', render: (d: DealerWithCount) => d._count.offers },
    {
      key: 'createdAt',
      label: 'Создан',
      render: (d: DealerWithCount) => format(d.createdAt, 'dd.MM.yyyy HH:mm'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дилеры</h1>
      </div>
      <DataTable
        data={dealers}
        columns={columns}
        keyField="id"
        detailPath={(d) => `/admin/dealers/${d.id}`}
        pagination={{ page, limit: LIMIT, total }}
        basePath="/admin/dealers"
      />
    </div>
  );
}
