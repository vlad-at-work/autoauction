import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent } from '@/components/ui/card';
import { CountdownTimer } from '@/components/countdown-timer';
import { cn } from '@/lib/utils';

type InquiryCardProps = {
  inquiry: {
    id: string;
    model: string;
    submodel: string;
    createdAt: Date;
    expiresAt: Date;
    _count: { offers: number };
  };
};

export function InquiryCard({ inquiry }: InquiryCardProps) {
  const isExpired = new Date(inquiry.expiresAt) < new Date();
  const offerCount = inquiry._count.offers;

  return (
    <Link href={`/app/inquiry/${inquiry.id}`}>
      <Card className={cn('transition-colors hover:border-primary', isExpired && 'opacity-50')}>
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-base leading-tight">
                {inquiry.model} {inquiry.submodel !== inquiry.model && inquiry.submodel}
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                {format(new Date(inquiry.createdAt), 'd MMM', { locale: ru })}
              </p>
            </div>
            {isExpired && (
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-xs font-medium">
                Истекло
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <CountdownTimer expiresAt={inquiry.expiresAt} isExpired={isExpired} />
            <div className="flex items-center gap-1">
              <MessageSquare className="size-4" />
              <span>{offerCount === 0 ? 'Нет предложений' : `${offerCount}`}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
