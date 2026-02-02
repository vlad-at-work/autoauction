import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Buyer, Prisma } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{
  page?: string;
  q?: string;
  platform?: string;
  deleted?: string;
}>;

export default async function BuyersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const q = (params.q || '').trim();
  const platform = params.platform || '';
  const deleted = params.deleted || '';

  const where: Prisma.BuyerWhereInput = {};

  if (platform === 'MAX' || platform === 'TELEGRAM') {
    where.platform = platform;
  }

  if (deleted === 'only') {
    where.deletedAt = { not: null };
  } else if (deleted !== 'with') {
    where.deletedAt = null;
  }

  if (q) {
    where.OR = [
      { platformUserId: { contains: q, mode: 'insensitive' } },
      { platformUserName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [buyers, total] = await Promise.all([
    prisma.buyer.findMany({
      where,
      skip: (page - 1) * LIMIT,
      take: LIMIT,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { inquiries: true } },
      },
    }),
    prisma.buyer.count({ where }),
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
    {
      key: 'deletedAt',
      label: 'Удалён',
      render: (b: Buyer & { _count: { inquiries: number } }) =>
        b.deletedAt ? format(b.deletedAt, 'dd.MM.yyyy HH:mm') : '-',
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Покупатели</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/buyers/new">+ Добавить</Link>
        </Button>
      </div>

      <form
        method="get"
        className="mb-4 grid grid-cols-1 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-4"
      >
        <div className="sm:col-span-2">
          <Input name="q" placeholder="Поиск: имя или ID" defaultValue={q} />
        </div>
        <div>
          <select
            name="platform"
            defaultValue={platform}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Все платформы</option>
            <option value="TELEGRAM">TELEGRAM</option>
            <option value="MAX">MAX</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <select
            name="deleted"
            defaultValue={deleted}
            className="border-input bg-input/20 dark:bg-input/30 h-7 w-full rounded-md border px-2 text-sm md:text-xs/relaxed"
          >
            <option value="">Только активные</option>
            <option value="with">С учетом удалённых</option>
            <option value="only">Только удалённые</option>
          </select>
          <Button type="submit" variant="outline" size="sm">
            Фильтр
          </Button>
        </div>
      </form>

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
