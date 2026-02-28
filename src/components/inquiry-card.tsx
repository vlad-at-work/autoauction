import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Check, ChevronRight, MessageSquare } from 'lucide-react';
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
        <CardContent className="flex items-center gap-4 p-4">
          {/* Left: main info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-lg font-semibold leading-tight">
                {inquiry.model} {inquiry.submodel !== inquiry.model && inquiry.submodel}
              </h3>
              {transactionCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Check className="size-3" />
                  {transactionCount}
                </span>
              )}
            </div>
            <div className="text-muted-foreground mt-1.5 flex items-center gap-3 text-sm">
              <span>{format(new Date(inquiry.createdAt), 'd MMM', { locale: ru })}</span>
              <span className="text-muted-foreground/40">·</span>
              <CountdownTimer expiresAt={inquiry.expiresAt} isExpired={isExpired} />
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1">
                <MessageSquare className="size-3.5" />
                {offerCount === 0 ? 'нет' : offerCount}
              </span>
            </div>
          </div>

          {/* Right: chevron */}
          <ChevronRight className="text-muted-foreground/50 size-5 shrink-0" />
        </CardContent>
      </Card>
    </Link>
  );
}
