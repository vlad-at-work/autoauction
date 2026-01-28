import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';

type OfferCardProps = {
  offer: {
    id: string;
    price: number;
    comment: string | null;
    createdAt: Date;
  };
  inquiryId: string;
};

export function OfferCard({ offer, inquiryId }: OfferCardProps) {
  return (
    <Link href={`/app/inquiry/${inquiryId}/offer/${offer.id}`}>
      <Card className="transition-colors hover:border-primary">
        <CardContent className="flex flex-col gap-2 p-4">
          <div className="text-2xl font-bold">{offer.price.toLocaleString('ru-RU')} ₽</div>
          {offer.comment && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{offer.comment}</p>
          )}
          <p className="text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(offer.createdAt), {
              addSuffix: true,
              locale: ru,
            })}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
