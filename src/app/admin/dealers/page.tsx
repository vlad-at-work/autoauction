import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Dealer, Prisma } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{
  page?: string;
  q?: string;
  active?: string;
  deleted?: string;
}>;

type DealerWithCount = Dealer & { _count: { offers: number } };

export default async function DealersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const q = (params.q || '').trim();
  const active = params.active || '';
  const deleted = params.deleted || '';

  const where: Prisma.DealerWhereInput = {};

  if (active === 'true') where.active = true;
  if (active === 'false') where.active = false;

  if (deleted === 'only') {
    where.deletedAt = { not: null };
  } else if (deleted !== 'with') {
    where.deletedAt = null;
  }

  if (q) {
    where.OR = [
      { username: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { subName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [dealers, total] = await Promise.all([
    prisma.dealer.findMany({
      where,
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { offers: true } },
      },
    }),
    prisma.dealer.count({ where }),
  ]);

  const columns = [
    { key: 'id', label: 'ID', render: (d: DealerWithCount) => d.id.slice(0, 8) + '...' },
    { key: 'username', label: 'Имя пользователя' },
    { key: 'name', label: 'Имя', render: (d: DealerWithCount) => d.name || '-' },
    { key: 'subName', label: 'Дилерский центр', render: (d: DealerWithCount) => d.subName || '-' },
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
    {
      key: 'deletedAt',
      label: 'Удалён',
      render: (d: DealerWithCount) => (d.deletedAt ? format(d.deletedAt, 'dd.MM.yyyy HH:mm') : '-'),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дилеры</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/dealers/new">+ Добавить</Link>
        </Button>
      </div>

      <form
        method="get"
        className="mb-4 grid grid-cols-1 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-5"
      >
        <div className="sm:col-span-2">
          <Input name="q" placeholder="Поиск: username/имя/центр/тел/email" defaultValue={q} />
        </div>
        <div>
          <select
            name="active"
            defaultValue={active}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Все</option>
            <option value="true">Только активные</option>
            <option value="false">Только неактивные</option>
          </select>
        </div>
        <div>
          <select
            name="deleted"
            defaultValue={deleted}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Только активные</option>
            <option value="with">С учетом удалённых</option>
            <option value="only">Только удалённые</option>
          </select>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" variant="outline" size="sm">
            Фильтр
          </Button>
        </div>
      </form>

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
