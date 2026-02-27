import { prisma } from '@/lib/db';
import { BroadcastForm } from '@/components/admin/broadcast-form';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const counts = await prisma.buyer.groupBy({
    by: ['platform'],
    where: { deletedAt: null },
    _count: true,
  });

  const tgCount = counts.find((c) => c.platform === 'TELEGRAM')?._count ?? 0;
  const maxCount = counts.find((c) => c.platform === 'MAX')?._count ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Оповещения</h1>
      <BroadcastForm tgCount={tgCount} maxCount={maxCount} />
    </div>
  );
}
