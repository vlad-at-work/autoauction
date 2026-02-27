import Link from 'next/link';
import { prisma } from '@/lib/db';
import { DataTable } from '@/components/admin/data-table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPhoneRU } from '@/lib/format-phone';
import type { Inquiry, Buyer, Prisma } from '@prisma/client';

const LIMIT = 25;

type SearchParams = Promise<{
  page?: string;
  status?: string;
  q?: string;
  deleted?: string;
}>;

type InquiryWithRelations = Inquiry & {
  buyer: Buyer;
  _count: { offers: number };
};

export default async function InquiriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10));
  const statusFilter = params.status;
  const q = (params.q || '').trim();
  const deleted = params.deleted || '';

  const now = new Date();
  const where: Prisma.InquiryWhereInput = {};

  if (statusFilter === 'active') where.expiresAt = { gte: now };
  if (statusFilter === 'expired') where.expiresAt = { lt: now };

  if (deleted === 'only') {
    where.deletedAt = { not: null };
  } else if (deleted !== 'with') {
    where.deletedAt = null;
  }

  if (q) {
    where.OR = [
      { id: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { model: { contains: q, mode: 'insensitive' } },
      { submodel: { contains: q, mode: 'insensitive' } },
      { buyer: { platformUserId: { contains: q, mode: 'insensitive' } } },
      { buyer: { platformUserName: { contains: q, mode: 'insensitive' } } },
    ];
  }

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
      render: (i: InquiryWithRelations) =>
        i.name || i.buyer.platformUserName || i.buyer.platformUserId,
    },
    {
      key: 'model',
      label: 'Модель',
      render: (i: InquiryWithRelations) => `${i.model} ${i.submodel}`,
    },
    { key: 'phone', label: 'Телефон', render: (i: InquiryWithRelations) => formatPhoneRU(i.phone) },
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
    {
      key: 'deletedAt',
      label: 'Удалена',
      render: (i: InquiryWithRelations) =>
        i.deletedAt ? format(i.deletedAt, 'dd.MM.yyyy HH:mm') : '-',
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Заявки</h1>
        <div className="flex items-center gap-2">
          <Badge variant={!statusFilter ? 'default' : 'outline'} className="cursor-pointer" asChild>
            <Link href="/admin/inquiries" prefetch={false}>
              Все
            </Link>
          </Badge>
          <Badge
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            className="cursor-pointer"
            asChild
          >
            <Link href="/admin/inquiries?status=active" prefetch={false}>
              Активные
            </Link>
          </Badge>
          <Badge
            variant={statusFilter === 'expired' ? 'default' : 'outline'}
            className="cursor-pointer"
            asChild
          >
            <Link href="/admin/inquiries?status=expired" prefetch={false}>
              Истекшие
            </Link>
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/inquiries/new" prefetch={false}>
              + Создать
            </Link>
          </Button>
        </div>
      </div>

      <form
        method="get"
        className="mb-4 grid grid-cols-1 gap-2 rounded-lg border bg-card p-3 sm:grid-cols-4"
      >
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <div className="sm:col-span-2">
          <Input name="q" placeholder="Поиск: ID, телефон, модель, покупатель" defaultValue={q} />
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
        data={inquiries}
        columns={columns}
        keyField="id"
        detailPath={(i) => `/admin/inquiries/${i.id}`}
        pagination={{ page, limit: LIMIT, total }}
        basePath="/admin/inquiries"
      />
    </div>
  );
}
