import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, MessageSquare } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
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
    _count: {
      offers: number;
      transactions?: number;
    };
  };
};

export function InquiryCard({ inquiry }: InquiryCardProps) {
  const isExpired = new Date(inquiry.expiresAt) < new Date();
  const offerCount = inquiry._count.offers;
  const transactionCount = inquiry._count.transactions ?? 0;

  return (
    <Link href={`/app/inquiry/${inquiry.id}`}>
      <Card className={cn('transition-colors hover:border-primary', isExpired && 'opacity-60')}>
        <CardContent className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold leading-tight">
                {inquiry.model} {inquiry.submodel !== inquiry.model && inquiry.submodel}
              </h3>
              <p className="text-muted-foreground mt-1.5 text-base">
                {format(new Date(inquiry.createdAt), 'd MMM', { locale: ru })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {isExpired && (
                <span className="bg-muted text-muted-foreground rounded-full px-3 py-1.5 text-sm font-medium">
                  Истекло
                </span>
              )}
              {transactionCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-green-200 bg-green-50 text-green-700 text-sm"
                >
                  <Check className="mr-1 size-4" />
                  {transactionCount} принято
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-base">
            <CountdownTimer expiresAt={inquiry.expiresAt} isExpired={isExpired} />
            <div className="flex items-center gap-2">
              <MessageSquare className="size-5" />
              <span>{offerCount === 0 ? 'Нет предложений' : `${offerCount} предл.`}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
